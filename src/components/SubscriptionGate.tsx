import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

type SubscriptionState = "loading" | "active" | "trialing" | "past_due" | "locked" | "none";

interface Company {
  id: string;
  name: string;
  subscription_status: string | null;
  trial_end_date: string | null;
  grace_period_ends_at: string | null;
  locked_at: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>("loading");
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setState("none");
      return;
    }

    // Get user's company
    const { data: roles } = await supabase
      .from("user_roles")
      .select("company_id")
      .eq("user_id", session.user.id)
      .limit(1);

    const companyId = roles?.[0]?.company_id;
    if (!companyId) {
      setState("none");
      return;
    }

    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name, subscription_status, trial_end_date, grace_period_ends_at, locked_at")
      .eq("id", companyId)
      .single();

    if (!companyData) {
      setState("none");
      return;
    }

    setCompany(companyData);

    // Determine subscription state
    if (companyData.locked_at) {
      setState("locked");
    } else if (companyData.subscription_status === "active") {
      setState("active");
    } else if (companyData.subscription_status === "trialing" || companyData.subscription_status === "trial") {
      // Check if trial has expired
      if (companyData.trial_end_date && new Date(companyData.trial_end_date) < new Date()) {
        setState("locked");
      } else {
        setState("trialing");
      }
    } else if (companyData.subscription_status === "past_due") {
      // Check if grace period has expired
      if (companyData.grace_period_ends_at && new Date(companyData.grace_period_ends_at) < new Date()) {
        setState("locked");
      } else {
        setState("past_due");
      }
    } else {
      setState("none");
    }
  }

  return { state, company };
}

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { state, company } = useSubscription();

  if (state === "loading") {
    return null; // Let the portal loading state handle this
  }

  if (state === "locked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Subscription Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {company?.name}'s subscription has expired. Reactivate to restore access to time tracking, job costing, and employee data.
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => window.location.href = "mailto:support@punchcardpro.io?subject=Reactivate%20Subscription"}>
                Reactivate Subscription
              </Button>
              <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "past_due") {
    return (
      <div>
        {/* Show banner but allow access during grace period */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
          Payment overdue — grace period active until {company?.grace_period_ends_at ? new Date(company.grace_period_ends_at).toLocaleDateString() : "soon"}. Update billing to avoid lockout.
        </div>
        {children}
      </div>
    );
  }

  if (state === "trialing") {
    return (
      <div>
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm text-primary">
          Free trial {company?.trial_end_date ? `ends ${new Date(company.trial_end_date).toLocaleDateString()}` : "active"}. Subscribe to keep access after trial ends.
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
