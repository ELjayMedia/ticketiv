-- Signed-in visitors can read public lineups, the same as signed-out ones.
--
-- artists_public_lineup_select and event_artists_public_select are granted to
-- anon only. The authenticated policies cover only an artist's own user or org
-- members, so a signed-in attendee gets a 404 on /artists/[id] for any
-- lineup-created artist and sees no tour dates, while a signed-out visitor
-- sees both. These policies mirror the anon rules exactly for authenticated.
-- Read-only and additive. Rollback: drop the two policies.

drop policy if exists artists_public_lineup_select_authenticated on public.artists;
create policy artists_public_lineup_select_authenticated on public.artists
  for select to authenticated
  using (exists (
    select 1 from public.event_artists ea
    join public.events e on e.id = ea.event_id
    where ea.artist_id = artists.id and e.visibility = 'public'
  ));

drop policy if exists event_artists_public_select_authenticated on public.event_artists;
create policy event_artists_public_select_authenticated on public.event_artists
  for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_artists.event_id and e.visibility = 'public'
  ));
