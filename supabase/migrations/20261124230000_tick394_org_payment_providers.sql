-- TICK-394 — organisation default payment methods.
--
-- organizations.payment_providers already narrows checkout in
-- fn_get_effective_payment_providers (platform → organisation → event →
-- ticket type), but nothing could set it. fn_set_org_payment_providers lets
-- organisation managers save the default: an empty list means "all
-- available"; otherwise only the listed providers. Changes are audited and
-- apply to new payment attempts only (completed payments are untouched).
-- Organisers never see or edit provider credentials.
--
-- Additive. Rollback: drop function public.fn_set_org_payment_providers(uuid, text[]).

create or replace function public.fn_set_org_payment_providers(p_org_id uuid, p_providers text[])
returns text[]
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_new text[] := array(select distinct lower(btrim(x)) from unnest(coalesce(p_providers, '{}')) x where btrim(x) <> '' order by 1);
  v_old text[];
begin
  if not app.is_org_manager(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (v_new <@ array['deltapay', 'momo', 'paystack']) then
    raise exception 'provider_invalid' using errcode = 'P0001';
  end if;
  select payment_providers into v_old from public.organizations where id = p_org_id for update;
  update public.organizations set payment_providers = v_new where id = p_org_id;
  insert into public.audit_log (org_id, actor_id, table_name, record_id, action, changes)
  values (p_org_id, (select auth.uid()), 'organizations', p_org_id::text, 'update'::public.audit_action,
          jsonb_build_object('section', 'payment_providers', 'before', coalesce(to_jsonb(v_old), '[]'::jsonb), 'after', to_jsonb(v_new)));
  return v_new;
end;
$$;
revoke all on function public.fn_set_org_payment_providers(uuid, text[]) from public, anon;
grant execute on function public.fn_set_org_payment_providers(uuid, text[]) to authenticated, service_role;
