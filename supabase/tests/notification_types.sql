-- Regression: follower alerts and other feature notifications are stored.
-- Run against an ISOLATED database only; rolls back.
--   psql "$TICKETIV_CROSS_ORG_TEST_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/notification_types.sql
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_org uuid; v_user uuid := gen_random_uuid(); v_artist uuid; v_event uuid; v_venue uuid; v_missing text;
begin
  insert into auth.users (id, email, aud, role, instance_id)
  values (v_user, 'notif-' || left(v_user::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.organizations (name, slug) values ('Notif Org', 'notif-' || left(gen_random_uuid()::text, 8)) returning id into v_org;
  insert into public.artists (name, slug) values ('Notif Artist ' || left(v_user::text, 6), 'notif-artist-' || left(v_user::text, 8)) returning id into v_artist;
  insert into public.venues (name, slug, city) values ('Notif Hall ' || left(v_user::text, 6), 'notif-hall-' || left(v_user::text, 8), 'Mbabane') returning id into v_venue;
  insert into public.org_follows (user_id, org_id) values (v_user, v_org);
  insert into public.artist_follows (user_id, artist_id) values (v_user, v_artist);

  -- Draft first so the lineup exists, then publish: the follower triggers fire on publish.
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at)
  values (v_org, v_venue, 'Notif Night', 'notif-night-' || left(v_user::text, 8), 'draft', 'public', now() + interval '7 days')
  returning id into v_event;
  insert into public.event_artists (event_id, artist_id) values (v_event, v_artist);
  update public.events set status = 'published' where id = v_event;

  if not exists (select 1 from public.notifications where user_id = v_user and type = 'organizer_new_event') then
    raise exception 'organizer follower alert was not stored';
  end if;

  -- Every type a feature writes must be accepted by the table.
  select string_agg(t, ', ') into v_missing
  from unnest(array['organizer_new_event', 'artist_new_event', 'event_update', 'event_reminder',
    'saved_event_reminder', 'feedback_request', 'duplicate_permission_request',
    'duplicate_permission_decision', 'email_broadcast', 'refund_request', 'resale_listing_created',
    'resale_purchase_completed', 'waitlist_offer_fulfilled']) t
  where not exists (
    select 1 from pg_constraint c
    where c.conname = 'check_notifications_type_channel'
      and pg_get_constraintdef(c.oid) like '%''' || t || '''%');
  if v_missing is not null then
    raise exception 'notification types rejected by constraint: %', v_missing;
  end if;

  raise notice 'NOTIFICATION TYPES: follower alert stored, all feature types accepted';
end $$;
rollback;
