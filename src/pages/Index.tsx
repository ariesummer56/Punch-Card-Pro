import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, MapPin, Menu, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const features = [
  { icon: BriefcaseBusiness, title: "Job tracking", description: "Tie every clock-in to the right job, site, or task so labor is captured where it belongs." },
  { icon: TrendingUp, title: "Cost tracking", description: "See labor costs as they build, compare work against budgets, and keep projects profitable." },
  { icon: Clock3, title: "Employee timelines", description: "Review clear daily activity records with punches, breaks, edits, and approvals in one place." },
  { icon: MapPin, title: "Location tracking", description: "Confirm teams are clocking in from approved locations without slowing down the workday." },
];

const adminBenefits = ["Real-time crew visibility", "Cleaner payroll approvals", "Accurate job-cost reporting", "Fewer manual timecard corrections"];
const employeeBenefits = ["Fast mobile clock-ins", "Transparent hour history", "Less paperwork after shifts", "Confidence every punch is recorded"];

const Index = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to main content</a>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl" role="banner">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Punch Card Pro — home">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" aria-hidden="true">
              <Clock3 className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-normal">Punch Card Pro</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex" aria-label="Primary navigation">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#benefits" className="transition-colors hover:text-foreground">Benefits</a>
            <Link to="/demo" className="transition-colors hover:text-foreground">Demo</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Button asChild><Link to="/sign-up">Sign Up</Link></Button>
            <Button asChild variant="ghost"><Link to="/admin-login">Admin Login</Link></Button>
            <Button asChild variant="outline"><Link to="/employee-login">Employee Login</Link></Button>
            <Button asChild variant="secondary"><Link to="/request-demo">Request Demo</Link></Button>
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button className="md:hidden" size="icon" variant="ghost" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <nav className="mt-8 flex flex-col gap-1 text-base font-medium" aria-label="Mobile navigation">
                <a href="#features" onClick={closeMenu} className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Features</a>
                <a href="#benefits" onClick={closeMenu} className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Benefits</a>
                <Link to="/demo" onClick={closeMenu} className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Demo</Link>
              </nav>
              <Separator className="my-6" />
              <div className="flex flex-col gap-3">
                <Button asChild onClick={closeMenu}><Link to="/sign-up">Sign Up</Link></Button>
                <Button asChild variant="outline" onClick={closeMenu}><Link to="/admin-login">Admin Login</Link></Button>
                <Button asChild variant="outline" onClick={closeMenu}><Link to="/employee-login">Employee Login</Link></Button>
                <Button asChild variant="secondary" onClick={closeMenu}><Link to="/request-demo">Request Demo</Link></Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section id="main-content" aria-labelledby="hero-heading" className="relative border-b bg-[image:var(--gradient-hero)]">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-8 px-5 py-10 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:px-8 lg:py-20">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Built for crews, job sites, and payroll teams
            </div>
            <h1 id="hero-heading" className="max-w-4xl text-3xl font-semibold leading-[1.05] tracking-normal text-foreground sm:text-5xl md:text-6xl lg:text-7xl lg:leading-[1.02]">
              Streamline employee time tracking from clock-in to job cost.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 lg:text-xl">
              Punch Card Pro helps admins capture accurate hours, monitor labor costs, and give employees a faster way to clock in with confidence.
            </p>
            <div className="mt-9 flex flex-col gap-3 md:flex-row md:flex-wrap">
              <Button asChild size="lg" className="h-12 w-full px-6 text-base shadow-[var(--shadow-brand)] md:w-auto">
                <Link to="/sign-up">Get Started Free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-12 w-full px-6 text-base md:w-auto">
                <Link to="/request-demo">Request Demo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 w-full px-6 text-base md:w-auto">
                <Link to="/admin-login">Admin Login</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 w-full px-6 text-base md:w-auto">
                <Link to="/employee-login">Employee Login</Link>
              </Button>
            </div>
          </div>
          <div className="relative" aria-hidden="true">
            <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-panel)]">
              <div className="rounded-xl border bg-secondary/50 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's labor snapshot</p>
                    <p className="text-2xl font-semibold">142.5 hrs tracked</p>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">Live</span>
                </div>
                <div className="space-y-3">
                  {["North Ridge Build", "Downtown Service", "Warehouse Install"].map((job, index) => (
                    <div key={job} className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border bg-card p-4">
                      <div>
                        <p className="font-medium">{job}</p>
                        <p className="text-sm text-muted-foreground">{18 + index * 7} employees active</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${(4200 + index * 1350).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">labor cost</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-primary p-4 text-primary-foreground">
                    <p className="text-2xl font-semibold">98%</p>
                    <p className="text-xs opacity-80">approved</p>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-2xl font-semibold">31</p>
                    <p className="text-xs text-muted-foreground">locations</p>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-2xl font-semibold">6</p>
                    <p className="text-xs text-muted-foreground">alerts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" aria-labelledby="features-heading" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Core features</p>
            <h2 id="features-heading" className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">Everything needed to run cleaner time operations.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="rounded-xl shadow-sm transition-shadow hover:shadow-[var(--shadow-soft)]">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden="true">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" aria-labelledby="benefits-heading" className="border-y bg-secondary/45 px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 id="benefits-heading" className="sr-only">Benefits for admins and employees</h2>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8 shadow-sm">
              <UsersRound className="mb-5 h-8 w-8 text-primary" aria-hidden="true" />
              <h3 className="text-3xl font-semibold tracking-normal">Benefits for admins</h3>
              <p className="mt-4 leading-7 text-muted-foreground">Approve time faster, spot issues earlier, and understand labor costs before payroll closes.</p>
              <ul className="mt-8 space-y-4" aria-label="Admin benefits list">
                {adminBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />{benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-8 shadow-sm">
              <Clock3 className="mb-5 h-8 w-8 text-primary" aria-hidden="true" />
              <h3 className="text-3xl font-semibold tracking-normal">Benefits for employees</h3>
              <p className="mt-4 leading-7 text-muted-foreground">Clock in quickly, track time clearly, and avoid chasing paper forms or unclear edits.</p>
              <ul className="mt-8 space-y-4" aria-label="Employee benefits list">
                {employeeBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />{benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" aria-labelledby="cta-heading" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-primary px-6 py-14 text-center text-primary-foreground shadow-[var(--shadow-brand)] sm:px-12">
          <h2 id="cta-heading" className="text-4xl font-semibold tracking-normal sm:text-5xl">Ready to replace scattered timecards?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 opacity-85">Request a demo of Punch Card Pro and see how admins and employees can manage time with less friction.</p>
          <Button asChild size="lg" variant="secondary" className="mt-8 h-12 px-7 text-base">
            <Link to="/request-demo">Request Demo <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t px-5 py-8 lg:px-8" role="contentinfo">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Punch Card Pro. All rights reserved.</p>
          <nav aria-label="Footer navigation" className="flex gap-6">
            <Link to="/sign-up" className="transition-colors hover:text-foreground">Sign Up</Link>
            <Link to="/admin-login" className="transition-colors hover:text-foreground">Admin Login</Link>
            <Link to="/employee-login" className="transition-colors hover:text-foreground">Employee Login</Link>
            <Link to="/request-demo" className="transition-colors hover:text-foreground">Request Demo</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
};

export default Index;
