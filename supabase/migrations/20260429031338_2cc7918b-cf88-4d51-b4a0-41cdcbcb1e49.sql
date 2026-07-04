-- Public compatibility helpers are used by database rules only and should not be directly callable by app users.
REVOKE ALL ON FUNCTION public.user_company_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_company_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_admin_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Internal helpers remain callable by signed-in users because company-scoped access rules depend on them.
REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.user_company_id(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_company_admin(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_company_admin(UUID, UUID) TO authenticated;