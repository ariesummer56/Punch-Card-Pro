import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Clock3, Eye, EyeOff, Loader2, Phone, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { track, trackConversion } from "@/lib/analytics";

const signupFields = {
  displayName: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string().min(1, "Confirm your password"),
  companyName: z.string().trim().min(2, "Enter a company name").max(140),
  phone: z.string().trim().max(40, "Phone number must be 40 characters or less").optional(),
  emergencyContact: z.string().trim().max(500, "Person to contact must be 500 characters or less").optional(),
  bestTimeToContact: z.string().trim().min(1, "Enter the best time to contact").max(120, "Best time to contact must be 120 characters or less"),
  adminAlertEmail: z.string().trim().email("Enter a valid alert email").max(255).optional().or(z.literal("")),
};

const baseSignupSchema = z.object({
  ...signupFields,
});

const signupSchema = baseSignupSchema.omit({ bestTimeToContact: true }).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

const demoRequestSchema = baseSignupSchema.extend({
  displayName: z.string().trim().min(1, "Enter a primary contact name").max(120, "Primary contact name must be 120 characters or less"),
  phone: z.string().trim().min(1, "Enter a phone number").max(40, "Phone number must be 40 characters or less"),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

const demoStepSchemas = [
  z.object({ displayName: z.string().trim().min(1, "Enter a primary contact name").max(120, "Primary contact name must be 120 characters or less"), companyName: signupFields.companyName }),
  z.object({ email: signupFields.email, password: signupFields.password }),
  z.object({ password: signupFields.password, confirmPassword: signupFields.confirmPassword }).refine((values) => values.password === values.confirmPassword, { message: "Passwords must match", path: ["confirmPassword"] }),
  z.object({ phone: z.string().trim().min(1, "Enter a phone number").max(40, "Phone number must be 40 characters or less"), bestTimeToContact: signupFields.bestTimeToContact }),
];

const demoSteps = ["Company", "Account", "Password", "Contact", "Review"];

type SignupProps = {
  mode: "signup" | "demo";
};

type FormState = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  phone: string;
  emergencyContact: string;
  bestTimeToContact: string;
  adminAlertEmail: string;
};

const PENDING_ADMIN_ONBOARDING_KEY = "punchCardProPendingAdminOnboarding";

type PendingAdminOnboarding = Pick<FormState, "companyName" | "displayName" | "phone" | "emergencyContact" | "adminAlertEmail" | "email"> & {
  contactEmail: string;
};

const initialForm: FormState = {
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
  companyName: "",
  phone: "",
  emergencyContact: "",
  bestTimeToContact: "",
  adminAlertEmail: "",
};

const savePendingAdminOnboarding = (values: PendingAdminOnboarding) => {
  localStorage.setItem(PENDING_ADMIN_ONBOARDING_KEY, JSON.stringify(values));
};

const Signup = ({ mode }: SignupProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [reviewEditing, setReviewEditing] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const updateForm = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const sendDemoRequestEmails = async (values: FormState, displayName: string) => {
    const requestedAt = new Date().toISOString();
    const requestId = crypto.randomUUID();
    const templateData = {
      requesterName: displayName,
      requesterEmail: values.email,
      companyName: values.companyName || undefined,
      phoneNumber: values.phone || undefined,
      primaryContactName: displayName,
      bestTimeToContact: values.bestTimeToContact || undefined,
      requestedAt,
    };

    const [adminResult, requesterResult] = await Promise.allSettled([
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "demo-request-admin-notification",
          recipientEmail: "eric@mailletconstruction.com",
          idempotencyKey: `demo-request-admin-${requestId}`,
          templateData,
        },
      }),
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "demo-request-thank-you",
          recipientEmail: values.email,
          idempotencyKey: `demo-request-thank-you-${requestId}`,
          templateData,
        },
      }),
    ]);

    const failed = [adminResult, requesterResult].some((result) => result.status === "rejected" || result.value.error);
    if (failed) toast.info("Demo request saved. Confirmation emails will send after email setup is complete.");
  };

  const validateDemoStep = (currentStep: number) => {
    if (currentStep >= 5) return true;
    const parsed = demoStepSchemas[currentStep - 1].safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check this step before continuing");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateDemoStep(step)) return;
    setStep((current) => Math.min(5, current + 1));
  };

  const createAccount = async (event?: FormEvent) => {
    event?.preventDefault();
    const parsed = (mode === "demo" ? demoRequestSchema : signupSchema).safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check your setup details");
      return;
    }

    setLoading(true);
    const values = form;
    const displayName = values.displayName?.trim() || values.email.split("@")[0];
    const onboardingPayload: PendingAdminOnboarding = {
      companyName: values.companyName,
      displayName,
      phone: values.phone,
      emergencyContact: values.emergencyContact,
      contactEmail: values.email,
      adminAlertEmail: values.adminAlertEmail || values.email,
      email: values.email,
    };

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });

    if (signupError) {
      setLoading(false);
      toast.error(signupError.message);
      return;
    }

    if (mode === "demo") await sendDemoRequestEmails(values, displayName);

    savePendingAdminOnboarding(onboardingPayload);

    if (!signupData.session) {
      setLoading(false);
      setVerificationEmail(values.email);
      track("sign_up");
        trackConversion("sign_up_complete");
        toast.success("Account created. Check your email to verify it before signing in.");
      return;
    }

    const { error: onboardingError } = await supabase.functions.invoke("complete-admin-onboarding", {
      body: {
        companyName: values.companyName,
        displayName,
        phone: values.phone || undefined,
        emergencyContact: values.emergencyContact || undefined,
        contactEmail: values.email,
        adminAlertEmail: values.adminAlertEmail || values.email,
      },
    });
    setLoading(false);

    if (onboardingError) {
      toast.error(onboardingError.message);
      return;
    }

    localStorage.removeItem(PENDING_ADMIN_ONBOARDING_KEY);
    toast.success(mode === "demo" ? "Demo request submitted" : "Company setup complete");
    navigate("/admin");
  };

  const saveReviewEdits = () => {
    const parsed = demoRequestSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Complete the required demo request fields");
      return;
    }

    setReviewEditing(false);
    toast.success("Demo request details saved");
  };

  const progressPercent = (step / demoSteps.length) * 100;

  const renderProgress = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>Step {step} of {demoSteps.length}</span>
        <span className="text-muted-foreground">{demoSteps[step - 1]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {demoSteps.map((label, index) => (
          <div key={label} className={`h-2 rounded-full ${index + 1 <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
    </div>
  );

  const renderDemoStep = () => {
    if (step === 1) return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Primary contact name</Label>
          <Input id="displayName" autoFocus value={form.displayName} onChange={(event) => updateForm("displayName", event.target.value)} placeholder="Primary contact name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName">Company name</Label>
          <Input id="companyName" value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} placeholder="Company LLC" />
        </div>
        <Button className="h-12 w-full" type="button" onClick={nextStep}>Continue <ArrowRight className="h-4 w-4" /></Button>
      </div>
    );

    if (step === 2) return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Admin email address</Label>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="admin@company.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" className="pr-12" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} placeholder="At least 8 characters" />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button className="h-12" type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" />Back</Button>
          <Button className="h-12" type="button" onClick={nextStep}>Continue <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    );

    if (step === 3) return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input id="confirmPassword" className="pr-12" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => updateForm("confirmPassword", event.target.value)} placeholder="Re-enter password" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button className="h-12" type="button" variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" />Back</Button>
            <Button className="h-12" type="button" onClick={nextStep}>Continue <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
    );

    if (step === 4) return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="Phone number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bestTimeToContact">Best time to contact</Label>
            <Input id="bestTimeToContact" value={form.bestTimeToContact} onChange={(event) => updateForm("bestTimeToContact", event.target.value)} placeholder="Weekdays after 3 PM" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button className="h-12" type="button" variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4" />Back</Button>
            <Button className="h-12" type="button" onClick={nextStep}>Review <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
    );

    return (
        <form className="space-y-4" onSubmit={createAccount}>
          <div className="space-y-4 rounded-lg border bg-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Completed demo request</p>
                <p className="text-sm text-muted-foreground">Review the required contact details before submitting.</p>
              </div>
              {reviewEditing ? (
                <Button type="button" variant="secondary" onClick={saveReviewEdits}>Save</Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => setReviewEditing(true)}>Edit</Button>
              )}
            </div>

            {reviewEditing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reviewCompanyName">Company name</Label>
                  <Input id="reviewCompanyName" value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewEmail">Email address</Label>
                  <Input id="reviewEmail" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewPhone">Phone number</Label>
                  <Input id="reviewPhone" type="tel" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewPrimaryContact">Primary contact name</Label>
                  <Input id="reviewPrimaryContact" value={form.displayName} onChange={(event) => updateForm("displayName", event.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="reviewBestTime">Best time to contact</Label>
                  <Input id="reviewBestTime" value={form.bestTimeToContact} onChange={(event) => updateForm("bestTimeToContact", event.target.value)} placeholder="Weekdays after 3 PM" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 text-primary" /><div><p className="font-medium">{form.companyName}</p><p className="text-sm text-muted-foreground">Company name</p></div></div>
                <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-primary" /><div><p className="font-medium">{form.email}</p><p className="text-sm text-muted-foreground">Email address</p></div></div>
                <div className="flex items-start gap-3"><Phone className="mt-1 h-5 w-5 text-primary" /><div><p className="font-medium">{form.phone}</p><p className="text-sm text-muted-foreground">Phone number</p></div></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 text-primary" /><div><p className="font-medium">{form.displayName}</p><p className="text-sm text-muted-foreground">Primary contact name</p></div></div>
                <div className="flex items-start gap-3"><Clock3 className="mt-1 h-5 w-5 text-primary" /><div><p className="font-medium">{form.bestTimeToContact}</p><p className="text-sm text-muted-foreground">Best time to contact</p></div></div>
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button className="h-12" type="button" variant="outline" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4" />Back</Button>
            <Button className="h-12" type="submit" disabled={loading || reviewEditing}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Submit demo request</Button>
          </div>
        </form>
    );
  };

  const renderDemoWizard = () => (
    <div className="space-y-6">
      {renderProgress()}
      {renderDemoStep()}
    </div>
  );

  const renderStandardSignup = () => (
    verificationEmail ? (
      <div className="space-y-5 rounded-lg border border-primary/30 bg-primary/10 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold tracking-normal">Check your email</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              We created your admin account for {verificationEmail}. Click the verification link in your inbox, then return to Punch Card Pro and use Admin Login to finish company setup.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => setVerificationEmail(null)}>Edit details</Button>
          <Button type="button" className="h-11" onClick={() => navigate("/admin-login")}>Go to admin login</Button>
        </div>
      </div>
    ) : (
    <form className="space-y-4" onSubmit={createAccount}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Admin name</Label>
          <Input id="displayName" value={form.displayName} onChange={(event) => updateForm("displayName", event.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyNameSignup">Company name</Label>
          <Input id="companyNameSignup" value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} placeholder="Company LLC" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailSignup">Email</Label>
        <Input id="emailSignup" type="email" autoComplete="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="admin@company.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordSignup">Password</Label>
        <div className="relative">
          <Input id="passwordSignup" className="pr-12" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} placeholder="At least 8 characters" />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPasswordSignup">Confirm password</Label>
        <div className="relative">
          <Input id="confirmPasswordSignup" className="pr-12" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => updateForm("confirmPassword", event.target.value)} placeholder="Re-enter password" />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}>
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phoneSignup">Admin phone</Label>
          <Input id="phoneSignup" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="Phone number" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminAlertEmail">Default alert email</Label>
          <Input id="adminAlertEmail" type="email" value={form.adminAlertEmail} onChange={(event) => updateForm("adminAlertEmail", event.target.value)} placeholder="alerts@company.com" />
        </div>
      </div>
      <Button className="h-12 w-full" type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create account</Button>
    </form>
    )
  );

  return (
    <main className="min-h-screen bg-[image:var(--gradient-hero)] px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-8 flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"><Clock3 className="h-5 w-5" /></span>
          Punch Card Pro
        </Link>

        <Card className="border-primary/30 shadow-[var(--shadow-panel)]">
          <CardHeader className="p-6 sm:p-8">
            <Button asChild variant="ghost" className="mb-3 w-fit px-0"><Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {mode === "demo" ? <ShieldCheck className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{mode === "demo" ? "Demo setup" : "Admin sign up"}</p>
            <CardTitle className="mt-2 text-3xl tracking-normal">{mode === "demo" ? "Set up your demo workspace" : "Create your admin account"}</CardTitle>
            <p className="mt-3 leading-7 text-muted-foreground">{mode === "demo" ? "Complete each step and review your contact details before submitting the demo request." : "Your company name is locked to the first admin account and appears on employee timesheets and weekly emails."}</p>
          </CardHeader>
          <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
            {mode === "demo" ? renderDemoWizard() : renderStandardSignup()}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Signup;
