import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Clock3, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

type LoginCredentials = z.infer<typeof loginSchema>;

type LoginProps = {
  portal: "admin" | "manager" | "employee";
};

const PENDING_ADMIN_ONBOARDING_KEY = "punchCardProPendingAdminOnboarding";

const getLoginErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("email not confirmed") || normalized.includes("email_not_confirmed")) {
    return "Please verify your email before signing in. Check your inbox for the confirmation link, then come back here to finish admin setup.";
  }
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials") || normalized.includes("not found")) {
    return "We couldn't find an account with that email and password. Check the email spelling, or create your admin account first.";
  }
  return message;
};

type PendingAdminOnboarding = {
  companyName: string;
  displayName?: string;
  phone?: string;
  emergencyContact?: string;
  contactEmail?: string;
  adminAlertEmail?: string;
  email?: string;
};

const buildAdminSetupPath = () => "/admin?setup=company";

const copy = {
  admin: {
    title: "Admin Login",
    eyebrow: "Punch Card Pro admin portal",
    description: "Access time approvals, job costs, employee timelines, and location visibility.",
    invite: "Admins manage invited employee accounts after signing in.",
  },
  manager: {
    title: "Manager Login",
    eyebrow: "Punch Card Pro manager portal",
    description: "View job sites, monitor clocked-in crews, and manage field updates.",
    invite: "Manager permissions are assigned by an admin after account creation.",
  },
  employee: {
    title: "Employee Login",
    eyebrow: "Punch Card Pro employee portal",
    description: "Clock in, review your timeline, and keep your hours accurate from your invited account.",
    invite: "Employee accounts are created by an admin invitation.",
  },
};

const Login = ({ portal }: LoginProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAdminEmail, setPendingAdminEmail] = useState<string | null>(null);
  const details = copy[portal];

  const completePendingAdminOnboarding = async (userEmail?: string | null) => {
    if (portal !== "admin") return false;

    const raw = localStorage.getItem(PENDING_ADMIN_ONBOARDING_KEY);
    if (!raw) return false;

    let pending: PendingAdminOnboarding;
    try {
      pending = JSON.parse(raw) as PendingAdminOnboarding;
    } catch {
      localStorage.removeItem(PENDING_ADMIN_ONBOARDING_KEY);
      return false;
    }

    if (!pending.companyName) return false;
    if (pending.email && userEmail && pending.email.toLowerCase() !== userEmail.toLowerCase()) return false;

    toast.info("Finish company setup to activate your admin account.");
    navigate(buildAdminSetupPath());
    return true;
  };

  const routeByRole = async (fallback: LoginProps["portal"]) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      navigate(fallback === "admin" ? "/admin-login" : fallback === "manager" ? "/manager-login" : "/employee-login");
      return;
    }

    if (await completePendingAdminOnboarding(userData.user.email)) return;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const assignedRoles = (roles ?? []).map((item) => item.role as "admin" | "manager" | "employee");
    const hasAdmin = assignedRoles.includes("admin");
    const hasManager = assignedRoles.includes("manager");
    const hasEmployee = assignedRoles.includes("employee") || assignedRoles.length === 0;

    // Route to the portal that matches the login page they used, when allowed.
    if (fallback === "employee") {
      // Employees stay on the employee portal even if a stale higher role exists.
      navigate("/employee");
    } else if (fallback === "manager") {
      if (hasManager) navigate("/manager");
      else if (hasAdmin) navigate("/admin");
      else navigate("/employee");
    } else {
      if (hasAdmin) navigate("/admin");
      else if (hasManager) navigate("/manager");
      else navigate("/employee");
    }
    if (!hasAdmin && !hasManager && !hasEmployee) navigate("/employee");
  };

  useEffect(() => {
    if (portal !== "admin") return;

    const raw = localStorage.getItem(PENDING_ADMIN_ONBOARDING_KEY);
    if (raw) {
      try {
        const pending = JSON.parse(raw) as PendingAdminOnboarding;
        setPendingAdminEmail(pending.email || pending.contactEmail || null);
      } catch {
        localStorage.removeItem(PENDING_ADMIN_ONBOARDING_KEY);
      }
    }

    const finishVerifiedSignup = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      setLoading(true);
      const completed = await completePendingAdminOnboarding(data.session.user.email);
      if (!completed) setLoading(false);
    };

    finishVerifiedSignup();
  }, [portal]);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check your login details");
      return;
    }

    setLoading(true);
    const credentials: LoginCredentials = parsed.data;
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      setLoading(false);
      toast.error(getLoginErrorMessage(error.message));
      return;
    }

    toast.success("Signed in successfully");
    await routeByRole(portal);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/${portal}-login` });
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }

    if (!result.redirected) {
      await routeByRole(portal);
    }
  };

  const handleDemoLogin = () => {
    sessionStorage.setItem("punchCardProDemoRole", portal);
    toast.success(`${portal === "admin" ? "Admin" : portal === "manager" ? "Manager" : "Employee"} demo loaded`);
    navigate(portal === "admin" ? "/admin" : portal === "manager" ? "/manager" : "/employee");
  };

  return (
    <main className="grid min-h-screen bg-[image:var(--gradient-hero)] lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden border-r px-10 py-10 lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-brand)]">
            <Clock3 className="h-5 w-5" />
          </span>
          Punch Card Pro
        </Link>
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{details.eyebrow}</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-normal">Time tracking built for teams that need accuracy.</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{details.description}</p>
        </div>
        <p className="text-sm text-muted-foreground">Secure login powered by Lovable Cloud authentication.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <Card className="w-full max-w-md rounded-2xl shadow-[var(--shadow-panel)]">
          <CardHeader className="space-y-4 p-6 sm:p-8">
            <Button asChild variant="ghost" className="w-fit px-0">
              <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to site</Link>
            </Button>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{details.eyebrow}</p>
              <CardTitle className="mt-3 text-3xl tracking-normal">{details.title}</CardTitle>
              <p className="mt-3 leading-7 text-muted-foreground">{details.invite}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6 pt-0 sm:p-8 sm:pt-0">
            {portal === "admin" && pendingAdminEmail ? (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm leading-6">
                <p className="font-medium text-foreground">Check your email to finish setup</p>
                <p className="mt-1 text-muted-foreground">
                  We created the admin account for {pendingAdminEmail}. Verify that email address, then sign in here to finish company setup.
                </p>
                <Button type="button" variant="link" className="mt-2 h-auto p-0" onClick={() => navigate("/sign-up")}>Use a different email</Button>
              </div>
            ) : null}
            <Button type="button" variant="outline" className="h-11 w-full" onClick={handleGoogleLogin} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue with Google
            </Button>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={async () => {
                      const parsedEmail = z.string().trim().email().safeParse(email);
                      if (!parsedEmail.success) {
                        toast.error("Enter your email above first, then tap Forgot password.");
                        return;
                      }
                      setLoading(true);
                      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
                        redirectTo: `${window.location.origin}/set-password`,
                      });
                      setLoading(false);
                      if (error) {
                        toast.error(error.message);
                        return;
                      }
                      toast.success("If an account exists for that email, we sent a reset link.");
                    }}
                    disabled={loading}
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input id="password" className="pr-12" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in
              </Button>
            </form>
            <Button type="button" variant="secondary" className="h-11 w-full" onClick={handleDemoLogin} disabled={loading}>
              View {portal} demo
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Login;
