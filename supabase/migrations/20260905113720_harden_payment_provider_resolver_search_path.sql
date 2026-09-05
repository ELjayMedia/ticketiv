-- Harden payment provider resolver search path
-- Fixes Supabase security advisor warning: function_search_path_mutable
-- Sets a restrictive search path since all references are schema-qualified as public.*

alter function public.fn_get_effective_payment_providers(uuid, uuid, uuid)
  set search_path = pg_catalog;
