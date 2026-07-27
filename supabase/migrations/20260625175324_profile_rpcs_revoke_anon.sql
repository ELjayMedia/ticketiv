begin;
revoke execute on function public.fn_set_default_payment_method(uuid) from public, anon;
revoke execute on function public.fn_deactivate_payment_method(uuid) from public, anon;
revoke execute on function public.fn_set_my_locale(text) from public, anon;
commit;
