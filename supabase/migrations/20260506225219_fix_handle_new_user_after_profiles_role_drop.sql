-- Regression fix: handle_new_user was writing profiles.role which was dropped in
-- profiles_drop_org_id_and_role_with_dependent_rewrites. Without this fix,
-- every new sign-up via auth.users fails on the on_auth_user_created trigger.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone)
  VALUES (NEW.id, NEW.phone::text)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates a profile row when an auth.users row is inserted. Mirrors phone if set at signup. Roles live in org_members and admin_users, not on profiles.';;
