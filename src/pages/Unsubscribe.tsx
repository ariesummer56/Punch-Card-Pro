import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type State = "validating" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    fetch(
      `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
      { headers: { apikey: anonKey } },
    )
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          setState("invalid");
          return;
        }
        if (body.valid === false && body.reason === "already_unsubscribed") {
          setState("already");
          return;
        }
        setState("valid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) {
      setErrorMsg(error.message);
      setState("error");
      return;
    }
    if (data?.success === false && data?.reason === "already_unsubscribed") {
      setState("already");
      return;
    }
    setState("done");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "validating" && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
            </p>
          )}
          {state === "valid" && (
            <>
              <p className="text-sm">
                Click below to unsubscribe from PunchcardPro emails. You'll stop receiving non-essential messages from us.
              </p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {state === "submitting" && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating your preferences…
            </p>
          )}
          {state === "done" && (
            <p className="text-sm">You've been unsubscribed. We're sorry to see you go.</p>
          )}
          {state === "already" && (
            <p className="text-sm">This email address is already unsubscribed. No further action needed.</p>
          )}
          {state === "invalid" && (
            <p className="text-sm text-destructive">This unsubscribe link is invalid or has expired.</p>
          )}
          {state === "error" && (
            <p className="text-sm text-destructive">Something went wrong: {errorMsg}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Unsubscribe;
