-- TICK-272 (S7): talent claim door — self-serve talent profile creation.
--
-- Progressive onboarding: any user can become "talent" by creating an artists row
-- owned via primary_user_id (no org). RLS insert on artists requires
-- org_id = get_user_org(), so personal/talent creation goes through this
-- SECURITY DEFINER RPC. The Talent context then surfaces automatically
-- (fn_get_ticketiv_effective_roles / getMyContexts read artists.primary_user_id).
-- One personal talent profile per user (idempotent).

begin;

create or replace function public.fn_create_talent_profile(p_name text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_name text := nullif(btrim(p_name), '');
  v_base text;
  v_slug text;
  v_id uuid;
  v_existing public.artists%rowtype;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if v_name is null then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  -- Idempotent: one personal (org-less) talent profile per user.
  select * into v_existing
  from public.artists
  where primary_user_id = v_user and org_id is null
  order by created_at
  limit 1;
  if found then
    return jsonb_build_object('id', v_existing.id, 'slug', v_existing.slug, 'name', v_existing.name, 'existing', true);
  end if;

  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if length(v_base) < 2 then
    v_base := 'artist';
  end if;
  v_base := left(v_base, 60);
  v_slug := v_base || '-' || substr(md5(random()::text || v_user::text), 1, 6);

  insert into public.artists (name, slug, primary_user_id, org_id)
  values (v_name, v_slug, v_user, null)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'name', v_name, 'existing', false);
end;
$function$;

revoke execute on function public.fn_create_talent_profile(text) from public, anon;
grant execute on function public.fn_create_talent_profile(text) to authenticated;

commit;
