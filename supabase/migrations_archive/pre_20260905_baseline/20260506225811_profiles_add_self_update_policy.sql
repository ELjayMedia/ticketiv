-- Profiles had no UPDATE policy; users couldn't edit their own display_name, name, surname.
-- Self-update only. Phone is mirrored from auth.users via trigger so it's not in scope here.

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

COMMENT ON POLICY profiles_self_update ON public.profiles IS
  'Users can update their own profile row. Phone is managed by the auth.users mirror trigger.';;
