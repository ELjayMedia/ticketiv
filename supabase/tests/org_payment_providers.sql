-- TICK-394: organisation default payment methods and the inheritance chain.
-- Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  owner_u uuid := gen_random_uuid();
  staff_u uuid := gen_random_uuid();
  other_u uuid := gen_random_uuid();
  v_org uuid; v_other uuid; v_event uuid; v_tt uuid; v_venue uuid; r text[]; v_err text; n int;
begin
  insert into auth.users (id, email, aud, role, instance_id)
  select x, 'pp-' || left(x::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
    from unnest(array[owner_u, staff_u, other_u]) x;
  insert into public.organizations (name, slug) values ('PP Org', 'pp-org-' || left(owner_u::text, 8)) returning id into v_org;
  insert into public.organizations (name, slug) values ('PP Other', 'pp-other-' || left(owner_u::text, 8)) returning id into v_other;
  insert into public.org_members (org_id, user_id, role) values (v_org, owner_u, 'organizer_owner'), (v_org, staff_u, 'organizer_staff'), (v_other, other_u, 'organizer_owner');
  insert into public.venues (name, slug, city) values ('PP Hall', 'pp-hall-' || left(owner_u::text, 8), 'Mbabane') returning id into v_venue;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, 'PP Night', 'pp-night-' || left(owner_u::text, 8), 'draft', 'public', now() + interval '9 days') returning id into v_event;
  insert into public.ticket_types (event_id, name, price_cents, currency, quota) values (v_event, 'GA', 10000, 'SZL', 100) returning id into v_tt;
  insert into public.payment_provider_settings (provider, is_enabled) values ('paystack', true), ('momo', true), ('deltapay', true)
    on conflict (provider) do update set is_enabled = true;

  -- Default: everything the platform enables.
  r := public.fn_get_effective_payment_providers(v_org, v_event, v_tt);
  if r <> array['deltapay', 'momo', 'paystack'] then raise exception 'default should be all enabled (got %)', r; end if;

  -- Owner saves an organisation default; it is normalised, stored and audited.
  perform set_config('request.jwt.claims', json_build_object('sub', owner_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  r := public.fn_set_org_payment_providers(v_org, array['MoMo', ' paystack ', 'momo']);
  execute 'reset role';
  if r <> array['momo', 'paystack'] then raise exception 'saved list should be normalised (got %)', r; end if;
  if (select payment_providers from public.organizations where id = v_org) <> array['momo', 'paystack'] then raise exception 'org default not stored'; end if;
  select count(*) into n from public.audit_log where table_name = 'organizations' and record_id = v_org::text and changes->>'section' = 'payment_providers';
  if n <> 1 then raise exception 'change should be audited (got %)', n; end if;

  -- Inheritance: event inherits the org default; an event override narrows it; a ticket type narrows further.
  r := public.fn_get_effective_payment_providers(v_org, v_event, v_tt);
  if r <> array['momo', 'paystack'] then raise exception 'event should inherit the org default (got %)', r; end if;
  update public.events set payment_providers = array['momo'] where id = v_event;
  r := public.fn_get_effective_payment_providers(v_org, v_event, null);
  if r <> array['momo'] then raise exception 'event override should narrow (got %)', r; end if;
  update public.events set payment_providers = '{}' where id = v_event;
  update public.ticket_types set payment_providers = array['paystack'] where id = v_tt;
  r := public.fn_get_effective_payment_providers(v_org, v_event, v_tt);
  if r <> array['paystack'] then raise exception 'ticket type override should narrow (got %)', r; end if;
  -- An event can never re-enable a provider the organisation excluded.
  update public.ticket_types set payment_providers = '{}' where id = v_tt;
  update public.events set payment_providers = array['deltapay'] where id = v_event;
  r := public.fn_get_effective_payment_providers(v_org, v_event, v_tt);
  if coalesce(array_length(r, 1), 0) <> 0 then raise exception 'event must not bypass the org allow-list (got %)', r; end if;
  update public.events set payment_providers = '{}' where id = v_event;
  -- A platform-disabled provider disappears everywhere.
  update public.payment_provider_settings set is_enabled = false where provider = 'paystack';
  r := public.fn_get_effective_payment_providers(v_org, v_event, v_tt);
  if r <> array['momo'] then raise exception 'disabled provider should drop out (got %)', r; end if;

  -- Clearing the list returns to "all available".
  perform set_config('request.jwt.claims', json_build_object('sub', owner_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  r := public.fn_set_org_payment_providers(v_org, '{}');
  begin perform public.fn_set_org_payment_providers(v_org, array['bitcoin']); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'provider_invalid' then raise exception 'unknown provider should be refused (got %)', coalesce(v_err, 'success'); end if;
  if public.fn_get_effective_payment_providers(v_org, v_event, v_tt) <> array['deltapay', 'momo'] then raise exception 'cleared default should allow all enabled'; end if;

  -- Door staff and other organisations can't change it.
  perform set_config('request.jwt.claims', json_build_object('sub', staff_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_set_org_payment_providers(v_org, array['momo']); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'staff should be refused (got %)', coalesce(v_err, 'success'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', other_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_set_org_payment_providers(v_org, array['momo']); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'another organisation should be refused (got %)', coalesce(v_err, 'success'); end if;
  execute 'set local role anon';
  begin perform public.fn_set_org_payment_providers(v_org, array['momo']); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'permission denied' then raise exception 'anon should be refused (got %)', coalesce(v_err, 'success'); end if;

  raise notice 'ORG PAYMENT PROVIDERS: save/normalise/audit, inherit, event and ticket overrides narrow, no bypass, disabled drops, clear, refusals';
end $$;
rollback;
