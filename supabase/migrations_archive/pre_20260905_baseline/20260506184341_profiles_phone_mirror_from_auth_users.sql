-- 3/6: profiles.phone mirrors auth.users.phone (canonical source).

-- Initial backfill (only where they don't match)
UPDATE public.profiles p
SET phone = u.phone::text
FROM auth.users u
WHERE p.user_id = u.id
  AND u.phone IS NOT NULL
  AND p.phone IS DISTINCT FROM u.phone::text;

-- Mirror function
CREATE OR REPLACE FUNCTION public.fn_mirror_user_phone_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE public.profiles
       SET phone = NEW.phone::text
     WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_mirror_user_phone_to_profile() IS
  'Mirrors auth.users.phone updates to public.profiles.phone. auth.users.phone is canonical; profiles.phone is a denormalized read cache.';

-- Trigger (idempotent)
DROP TRIGGER IF EXISTS tr_mirror_user_phone_to_profile ON auth.users;
CREATE TRIGGER tr_mirror_user_phone_to_profile
  AFTER UPDATE OF phone ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_mirror_user_phone_to_profile();;
