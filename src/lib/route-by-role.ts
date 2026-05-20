import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type PortalRole = "admin" | "manager" | "employee";

export const routeByRole = async (navigate: NavigateFunction, fallback: PortalRole = "employee") => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    navigate(fallback === "admin" ? "/admin-login" : fallback === "manager" ? "/manager-login" : "/employee-login");
    return;
  }

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const assignedRoles = (roles ?? []).map((item) => item.role as PortalRole);
  const hasAdmin = assignedRoles.includes("admin");
  const hasManager = assignedRoles.includes("manager");

  if (fallback === "employee") {
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
};
