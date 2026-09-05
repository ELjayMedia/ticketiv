
create policy "artists_public_lineup_select"
on public.artists
for select
to anon
using (
  exists (
    select 1
    from public.event_artists ea
    join public.events e on e.id = ea.event_id
    where ea.artist_id = artists.id
      and e.visibility = 'public'
  )
);
;
