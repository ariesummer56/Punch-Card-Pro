import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Clock3, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { routeByRole } from "@/lib/route-by-role";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm, { message: "Passwords don't match", path: ["confirm"] });

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const codeSchema = z.string().trim().min(6, "Enter the code from your email").max(10);

type LinkState = "checking" | "valid" | "expired";
type Mode = "link" | "code";

const SetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [mode, setMode] = useState<Mode>("link");
  const [codeEmail, setCodeEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const hashError = hashParams.get("error") || hashParams.get("error_code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (hashError) {
        if (!cancelled) setLinkState("expired");
        window.history.replaceState({}, "", "/set-password");
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!cancelled) setLinkState(error ? "expired" : "valid");
        window.history.replaceState({}, "", "/set-password");
        return;
      }

      if (tokenHash && (type === "recovery" || type === "invite")) {
        await supabase.auth.signOut().catch(() => {});
        const { error } = await supabase.auth.verifyOtp({ type: type as "recovery" | "invite", token_hash: tokenHash });
        if (!cancelled) setLinkState(error ? "expired" : "valid");
        window.history.replaceState({}, "", "/set-password");
        return;
      }

      const { data: existing } = await supabase.auth.getSession();
      if (existing.session?.user) {
        if (!cancelled) setLinkState("valid");
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" || (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION"))) {
          setLinkState("valid");
        }
      });
      subscription = sub.subscription;

      setTimeout(() => {
        if (cancelled) return;
        setLinkState((prev) => (prev === "checking" ? "expired" : prev));
      }, 4000);
    };

    init();
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check your password");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    toast.success("Password saved. You're signed in.");
    await routeByRole(navigate, "employee");
    setLoading(false);
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedEmail = emailSchema.safeParse(codeEmail);
    const parsedCode = codeSchema.safeParse(code);
    if (!parsedEmail.success) { toast.error(parsedEmail.error.errors[0]?.message ?? "Enter a valid email"); return; }
    if (!parsedCode.success) { toast.error(parsedCode.error.errors[0]?.message ?? "Enter the code from your email"); return; }
    setVerifying(true);
    await supabase.auth.signOut().catch(() => {});
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      email: parsedEmail.data,
      token: parsedCode.data,
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinkState("valid");
    toast.success("Code verified. Choose a new password.");
  };

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = emailSchema.safeParse(resendEmail);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Enter a valid email");
      return;
    }
    setResendLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setResendLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCodeEmail(parsed.data);
    setMode("code");
    toast.success("If an account exists for that email, we just sent a fresh link and code.");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[image:var(--gradient-hero)] px-5 py-10">
      <Card className="w-full max-w-md rounded-2xl shadow-[var(--shadow-panel)]">
        <CardHeader className="space-y-4 p-6 sm:p-8">
          <Button asChild variant="ghost" className="w-fit px-0">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to site</Link>
          </Button>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-brand)]">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Punch Card Pro</p>
              <CardTitle className="mt-1 text-2xl tracking-normal">Set your password</CardTitle>
            </div>
          </div>
          <p className="leading-7 text-muted-foreground">
            {linkState === "valid"
              ? "There is no default password. Choose the password you want to use to sign in from now on."
              : "Click the link in your email, or enter the verification code from the same email below."}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0 sm:p-8 sm:pt-0">
          {linkState === "valid" ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input id="password" className="pr-12" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2" onClick={() => setShowPassword((c) => !c)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save password and continue
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              {linkState === "checking" ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying your link… you can also use the code below.
                </div>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6">
                  <p className="font-medium text-foreground">Link didn't work or has expired.</p>
                  <p className="mt-1 text-muted-foreground">
                    Use the verification code from your email, or request a fresh email below.
                  </p>
                </div>
              )}

              <div className="flex gap-2 rounded-lg border bg-muted/30 p-1">
                <Button type="button" size="sm" variant={mode === "code" ? "default" : "ghost"} className="flex-1" onClick={() => setMode("code")}>Use a code</Button>
                <Button type="button" size="sm" variant={mode === "link" ? "default" : "ghost"} className="flex-1" onClick={() => setMode("link")}>Send a new link</Button>
              </div>

              {mode === "code" ? (
                <form className="space-y-3" onSubmit={handleVerifyCode}>
                  <div className="space-y-2">
                    <Label htmlFor="code-email">Your email</Label>
                    <Input id="code-email" type="email" autoComplete="email" value={codeEmail} onChange={(e) => setCodeEmail(e.target.value)} placeholder="name@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification code</Label>
                    <Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="From the password reset email" />
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={verifying}>
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Verify code and continue
                  </Button>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={handleResend}>
                  <div className="space-y-2">
                    <Label htmlFor="resend-email">Your email</Label>
                    <Input id="resend-email" type="email" autoComplete="email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} placeholder="name@company.com" />
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={resendLoading}>
                    {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Email me a new link and code
                  </Button>
                </form>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <p className="w-full text-xs uppercase tracking-[0.16em] text-muted-foreground">Or sign in</p>
                <Button asChild size="sm" variant="outline"><Link to="/employee-login">Employee</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/manager-login">Manager</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/admin-login">Admin</Link></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default SetPassword;
