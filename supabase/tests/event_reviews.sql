-- TICK-451: verified-attendee reviews, window, reports, moderation, replies,
-- organiser rating threshold and the anonymous public view.
-- Run against an ISOLATED database only; rolls back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  attendee uuid := gen_random_uuid();     -- scanned in
  holder uuid := gen_random_uuid();       -- has a ticket, never scanned
  stranger uuid := gen_random_uuid();
  manager uuid := gen_random_uuid();
  other_mgr uuid := gen_random_uuid();
  admin_u uuid := gen_random_uuid();
  rep1 uuid := gen_random_uuid(); rep2 uuid := gen_random_uuid(); rep3 uuid := gen_random_uuid();
  fans uuid[];
  v_org uuid; v_other uuid; v_venue uuid; v_ev uuid; v_old uuid; v_future uuid; v_tt uuid; v_tt_old uuid; v_tt_future uuid;
  v_review uuid; v_err text; n int; j jsonb; s text;
begin
  insert into auth.users (id, email, aud, role, instance_id)
  select x, 'er-' || left(x::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
    from unnest(array[attendee, holder, stranger, manager, other_mgr, admin_u, rep1, rep2, rep3]) x;
  insert into public.admin_users (user_id, role_tier, active) values (admin_u, 'super_admin', true);
  insert into public.organizations (name, slug) values ('ER Org', 'er-org-' || left(attendee::text, 8)) returning id into v_org;
  insert into public.organizations (name, slug) values ('ER Other', 'er-other-' || left(attendee::text, 8)) returning id into v_other;
  insert into public.org_members (org_id, user_id, role) values (v_org, manager, 'organizer_owner'), (v_other, other_mgr, 'organizer_owner');
  insert into public.venues (name, slug, city) values ('ER Hall', 'er-hall-' || left(attendee::text, 8), 'Mbabane') returning id into v_venue;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at, ends_at) values
    (v_org, v_venue, 'ER Gig', 'er-gig-' || left(attendee::text, 8), 'published', 'public', now() - interval '2 days 5 hours', now() - interval '2 days')
    returning id into v_ev;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at, ends_at) values
    (v_org, v_venue, 'ER Old', 'er-old-' || left(attendee::text, 8), 'published', 'public', now() - interval '20 days 5 hours', now() - interval '20 days')
    returning id into v_old;
  insert into public.events (org_id, venue_id, title, slug, status, visibility, starts_at) values
    (v_org, v_venue, 'ER Soon', 'er-soon-' || left(attendee::text, 8), 'published', 'public', now() + interval '3 days')
    returning id into v_future;
  insert into public.ticket_types (event_id, name, price_cents, currency, quota) values (v_ev, 'GA', 5000, 'SZL', 100) returning id into v_tt;
  insert into public.ticket_types (event_id, name, price_cents, currency, quota) values (v_old, 'GA', 5000, 'SZL', 100) returning id into v_tt_old;
  insert into public.ticket_types (event_id, name, price_cents, currency, quota) values (v_future, 'GA', 5000, 'SZL', 100) returning id into v_tt_future;

  -- Tickets: the attendee was scanned in at ER Gig and ER Old and holds one for ER Soon; the holder never scanned.
  with o as (insert into public.orders (org_id, buyer_id, status, total_cents, subtotal_cents, currency, channel, item_count) values (v_org, attendee, 'paid', 15000, 15000, 'SZL', 'online', 3) returning id)
  insert into public.order_items (order_id, ticket_type_id, status, ticket_code, checked_in_at, current_owner_id)
  select o.id, t.tt, (case when t.at is null then 'issued' else 'checked_in' end)::public.order_item_status, upper(gen_random_uuid()::text), t.at, attendee
    from o, (values (v_tt, now() - interval '2 days 3 hours'), (v_tt_old, now() - interval '20 days 3 hours'), (v_tt_future, null::timestamptz)) as t(tt, at);
  with o as (insert into public.orders (org_id, buyer_id, status, total_cents, subtotal_cents, currency, channel, item_count) values (v_org, holder, 'paid', 5000, 5000, 'SZL', 'online', 1) returning id)
  insert into public.order_items (order_id, ticket_type_id, status, ticket_code, current_owner_id)
  select o.id, v_tt, 'issued', upper(gen_random_uuid()::text), holder from o;

  insert into public.scans(event_id, order_item_id, ticket_code, outcome)
  select tt.event_id, oi.id, oi.ticket_code, 'valid' from public.order_items oi
    join public.ticket_types tt on tt.id = oi.ticket_type_id
    where oi.current_owner_id = attendee and oi.checked_in_at is not null;

  -- ── who can review, and when ───────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', holder::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_submit_event_review(v_ev, 5, 'Great', '{}'); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'review_attendees_only' then raise exception 'ticket holder who never scanned in must not review (got %)', coalesce(v_err, 'success'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', stranger::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_submit_event_review(v_ev, 1, 'Bad', '{}'); v_err := null; exception when others then v_err := sqlerrm; end;
  begin insert into public.event_reviews (event_id, user_id, rating) values (v_ev, stranger, 1); exception when others then v_err := v_err || ' / ' || sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'review_attendees_only.*permission denied' then raise exception 'stranger must not review by RPC or direct insert (got %)', coalesce(v_err, 'success'); end if;

  perform set_config('request.jwt.claims', json_build_object('sub', attendee::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_submit_event_review(v_old, 4, 'Late', '{}'); v_err := null; exception when others then v_err := sqlerrm; end;
  if coalesce(v_err, '') !~ 'review_closed' then execute 'reset role'; raise exception 'reviews close 14 days after the end (got %)', coalesce(v_err, 'success'); end if;
  begin perform public.fn_submit_event_review(v_future, 4, 'Early', '{}'); v_err := null; exception when others then v_err := sqlerrm; end;
  if coalesce(v_err, '') !~ 'review_attendees_only|review_not_open' then execute 'reset role'; raise exception 'a future event can''t be reviewed (got %)', coalesce(v_err, 'success'); end if;
  begin perform public.fn_submit_event_review(v_ev, 4, 'This was shit', '{}'); v_err := null; exception when others then v_err := sqlerrm; end;
  if coalesce(v_err, '') !~ 'review_language' then execute 'reset role'; raise exception 'blocked words should be refused (got %)', coalesce(v_err, 'success'); end if;
  begin perform public.fn_submit_event_review(v_ev, 4, 'ok', array['parking']); v_err := null; exception when others then v_err := sqlerrm; end;
  if coalesce(v_err, '') !~ 'tag_invalid' then execute 'reset role'; raise exception 'unknown tags should be refused (got %)', coalesce(v_err, 'success'); end if;
  v_review := public.fn_submit_event_review(v_ev, 4, 'Good sound, long queue.', array['Sound', 'venue', 'sound']);
  -- Editing in the window keeps one review.
  perform public.fn_submit_event_review(v_ev, 5, 'Good sound, queue moved fast in the end.', array['sound']);
  execute 'reset role';
  select count(*) into n from public.event_reviews where event_id = v_ev and user_id = attendee;
  if n <> 1 then raise exception 'one review per attendee per event (got %)', n; end if;
  if (select rating from public.event_reviews where id = v_review) <> 5 then raise exception 'edit should update the review'; end if;

  -- ── public view hides identities ───────────────────────────────────────────
  execute 'set local role anon';
  select count(*) into n from public.v_public_event_reviews where event_id = v_ev;
  begin perform 1 from public.event_reviews limit 1; v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if n <> 1 then raise exception 'anon should see the published review (got %)', n; end if;
  if coalesce(v_err, '') !~ 'permission denied' then raise exception 'anon must not read the base table (got %)', coalesce(v_err, 'success'); end if;
  select count(*) into n from information_schema.columns where table_name = 'v_public_event_reviews' and column_name in ('user_id', 'reporter_id');
  if n <> 0 then raise exception 'public view must not expose account ids'; end if;

  -- ── organiser reply ────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', other_mgr::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_reply_event_review(v_review, 'Not our event'); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'another organiser must not reply (got %)', coalesce(v_err, 'success'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', manager::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  perform public.fn_reply_event_review(v_review, 'Thanks! We added a second gate.');
  select count(*) into n from public.event_reviews where event_id = v_ev;
  execute 'reset role';
  if n <> 1 then raise exception 'organiser should read reviews of its events'; end if;
  if (select org_reply from public.v_public_event_reviews where id = v_review) is distinct from 'Thanks! We added a second gate.' then raise exception 'reply should be public'; end if;

  -- ── reports hide at 3, admin restores ──────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', attendee::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_report_event_review(v_review, 'mine'); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'cannot_report_own' then raise exception 'author must not report own review (got %)', coalesce(v_err, 'success'); end if;
  foreach s in array array[rep1::text, rep1::text, rep2::text] loop
    perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated', 'is_anonymous', false)::text, true);
    execute 'set local role authenticated';
    perform public.fn_report_event_review(v_review, 'Spam or abuse');
    execute 'reset role';
  end loop;
  if (select status from public.event_reviews where id = v_review) <> 'published' then raise exception 'two distinct reports should not hide the review'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', rep3::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  s := public.fn_report_event_review(v_review, 'Spam or abuse');
  execute 'reset role';
  if s <> 'hidden' then raise exception 'third report should hide the review (got %)', s; end if;
  execute 'set local role anon';
  select count(*) into n from public.v_public_event_reviews where id = v_review;
  execute 'reset role';
  if n <> 0 then raise exception 'hidden review must leave the public view'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', manager::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  begin perform public.fn_moderate_event_review(v_review, 'restore'); v_err := null; exception when others then v_err := sqlerrm; end;
  execute 'reset role';
  if coalesce(v_err, '') !~ 'forbidden' then raise exception 'organisers must not moderate (got %)', coalesce(v_err, 'success'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u::text, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.user_reports where review_id = v_review and resolved_at is null;
  perform public.fn_moderate_event_review(v_review, 'restore', 'Fair criticism');
  execute 'reset role';
  if n <> 3 then raise exception 'admin should see 3 open reports (got %)', n; end if;
  if (select status from public.event_reviews where id = v_review) <> 'published' then raise exception 'restore should republish'; end if;
  if (select count(*) from public.user_reports where review_id = v_review and resolution = 'restored') <> 3 then raise exception 'reports should be resolved'; end if;

  -- ── organiser rating only from 5 reviews ───────────────────────────────────
  j := public.fn_org_rating(v_org);
  if (j->>'count')::int <> 1 or j->>'average' is not null then raise exception 'rating hidden below 5 reviews (got %)', j; end if;
  fans := array(select gen_random_uuid() from generate_series(1, 4));
  insert into auth.users (id, email, aud, role, instance_id)
  select x, 'er-fan-' || left(x::text, 8) || '@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000' from unnest(fans) x;
  insert into public.event_reviews (event_id, user_id, rating) select v_ev, x, 3 from unnest(fans) x;
  execute 'set local role anon';
  j := public.fn_org_rating(v_org);
  execute 'reset role';
  if (j->>'count')::int <> 5 or (j->>'average')::numeric <> 3.4 then raise exception 'rating should show at 5 reviews: 3.4 (got %)', j; end if;

  raise notice 'EVENT REVIEWS: attendees only, 14-day window, language/tags, one per person, identity-free public view, replies, report threshold + admin restore, rating from 5';
end $$;
rollback;
