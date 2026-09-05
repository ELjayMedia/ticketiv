
ALTER FUNCTION public.fn_check_reserved_handle()              SET search_path = public;
ALTER FUNCTION public.fn_devices_require_event_for_scanner()  SET search_path = public;
ALTER FUNCTION public.fn_user_connections_set_responded_at()  SET search_path = public;
ALTER FUNCTION public.fn_profile_can_read(uuid)               SET search_path = public;
ALTER FUNCTION public.get_user_org()                          SET search_path = public;
ALTER FUNCTION public.has_app_role(text)                      SET search_path = public;
ALTER FUNCTION public.is_org_admin(uuid)                      SET search_path = public;
ALTER FUNCTION public.is_org_admin(uuid, uuid)                SET search_path = public;
;
