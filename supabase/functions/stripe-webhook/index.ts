import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function verifyStripeSignature(body: string, signature: string): Promise<any> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
  const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

  if (!timestamp || !sig) throw new Error("Invalid signature format");

  const signedPayload = `${timestamp}.${body}`;
  const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Allow 5 min clock skew
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) throw new Error("Signature too old");

  if (sig !== expectedHex) throw new Error("Invalid signature");

  return JSON.parse(body);
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event;
  try {
    event = await verifyStripeSignature(body, signature);
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan || "monthly";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!companyId) {
          console.error("No company_id in checkout metadata");
          break;
        }

        // Fetch subscription details from Stripe
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        const sub = await subRes.json();

        // Update company
        await supabase.from("companies").update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: sub.status === "trialing" ? "trialing" : "active",
          subscription_plan: plan,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          trial_end_date: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          locked_at: null,
          grace_period_ends_at: null,
          payment_failed_at: null,
        }).eq("id", companyId);

        // Upsert subscription record
        await supabase.from("subscriptions").upsert({
          company_id: companyId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: sub.status === "trialing" ? "trialing" : "active",
          plan,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const periodEnd = new Date(invoice.period.end * 1000).toISOString();

        await supabase.from("companies").update({
          subscription_status: "active",
          current_period_end: periodEnd,
          locked_at: null,
          grace_period_ends_at: null,
          payment_failed_at: null,
        }).eq("stripe_subscription_id", subscriptionId);

        await supabase.from("subscriptions").update({
          status: "active",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscriptionId);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const now = new Date();
        const graceEnd = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

        await supabase.from("companies").update({
          subscription_status: "past_due",
          payment_failed_at: now.toISOString(),
          grace_period_ends_at: graceEnd.toISOString(),
        }).eq("stripe_subscription_id", subscriptionId);

        await supabase.from("subscriptions").update({
          status: "past_due",
          updated_at: now.toISOString(),
        }).eq("stripe_subscription_id", subscriptionId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        await supabase.from("companies").update({
          subscription_status: "canceled",
          locked_at: new Date().toISOString(),
          current_period_end: null,
        }).eq("stripe_subscription_id", subscriptionId);

        await supabase.from("subscriptions").update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscriptionId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        await supabase.from("companies").update({
          subscription_status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        }).eq("stripe_subscription_id", subscriptionId);

        await supabase.from("subscriptions").update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscriptionId);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: "Handler failed" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
