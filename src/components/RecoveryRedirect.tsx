import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Globally catches Supabase password-recovery callbacks and routes them
 * to /set-password regardless of which page Supabase landed on.
 * Handles both implicit-flow hash tokens and PKCE ?code= flows, plus
 * the PASSWORD_RECOVERY auth event fired after the SDK consumes the hash.
 */
export const RecoveryRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/set-password") return;

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const hashParams = new URLSearchParams(hash);
    const search = window.location.search;
    const searchParams = new URLSearchParams(search);

    const isRecovery =
      hashParams.get("type") === "recovery" ||
      searchParams.get("type") === "recovery" ||
      (hashParams.get("access_token") && hashParams.get("refresh_token") &&
        hashParams.get("type") === "recovery");

    if (isRecovery) {
      navigate(`/set-password${search}${window.location.hash}`, { replace: true });
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/set-password", { replace: true });
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  return null;
};

export default RecoveryRedirect;
