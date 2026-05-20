import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "manager" | "employee";

const demoRole = (): AppRole | null => {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem("punchCardProDemoRole");
  return value === "admin" || value === "manager" || value === "employee" ? value : null;
};

const portalPath = (role: AppRole) => (role === "admin" ? "/admin" : role === "manager" ? "/manager" : "/employee");
const loginPath = (role: AppRole) => (role === "admin" ? "/admin-login" : role === "manager" ? "/manager-login" : "/employee-login");

interface RoleGuardProps {
  required: AppRole;
  children: ReactNode;
}

export const RoleGuard = ({ required, children }: RoleGuardProps) => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const demo = demoRole();
      if (demo) {
        if (demo === required) {
          if (!cancelled) { setAllowed(true); setChecking(false); }
        } else {
          navigate(portalPath(demo), { replace: true });
        }
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        navigate(loginPath(required), { replace: true });
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      const actualRole = (roleRow?.role as AppRole | undefined) ?? "employee";

      if (actualRole === required) {
        if (!cancelled) { setAllowed(true); setChecking(false); }
      } else {
        navigate(portalPath(actualRole), { replace: true });
      }
    };
    check();
    return () => { cancelled = true; };
  }, [navigate, required]);

  if (checking || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
