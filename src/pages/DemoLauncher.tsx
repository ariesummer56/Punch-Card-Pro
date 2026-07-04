import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const DEMO_ROLE = "admin" as const;

const DemoLauncher = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing session to avoid role conflicts
    sessionStorage.removeItem("punchCardProDemoRole");
    // Set demo role flag — RoleGuard reads this to bypass Supabase auth
    sessionStorage.setItem("punchCardProDemoRole", DEMO_ROLE);
    navigate("/admin", { replace: true });
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading demo…</span>
        <p className="text-xs text-muted-foreground/60">No account required</p>
      </div>
    </main>
  );
};

export default DemoLauncher;

