begin;

insert into public.organizations (id, name, slug, bio, logo, default_currency)
values (
  '00000000-0000-4000-8000-000000000101',
  'Ticketiv Test Fixtures',
  'ticketiv-test-fixtures',
  'Seed organization used for testing Ticketiv event discovery, ticket purchase, layout, checkout, and scanner flows.',
  'https://www.bush-fire.com/wp-content/uploads/2024/10/MTN-BUSHFIRE-logo.png',
  'SZL'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  bio = excluded.bio,
  logo = excluded.logo,
  default_currency = excluded.default_currency;

insert into public.venues (id, org_id, name, address, tz, capacity, city, slug)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Worship Pavilion', 'Open-air worship venue, Manzini, Eswatini', 'Africa/Mbabane', 900, 'Manzini', 'worship-pavilion-test'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'House on Fire', 'Malkerns Valley, Eswatini', 'Africa/Mbabane', 12000, 'Malkerns', 'house-on-fire-test'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', 'Luju Festival Grounds', 'Malkerns Valley, Eswatini', 'Africa/Mbabane', 8000, 'Malkerns', 'luju-festival-grounds-test'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000101', 'Makoti Festival Grounds', 'Manzini, Eswatini', 'Africa/Mbabane', 6000, 'Manzini', 'makoti-festival-grounds-test')
on conflict (id) do update set
  org_id = excluded.org_id,
  name = excluded.name,
  address = excluded.address,
  tz = excluded.tz,
  capacity = excluded.capacity,
  city = excluded.city,
  slug = excluded.slug;

insert into public.artists (id, org_id, name, bio, slug, image_url)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'Frans', 'Solo worship artist used for line-up rendering tests. This worship event intentionally has only Frans in the line-up.', 'frans-test', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 'Main Fire Stage Collective', 'Fixture artist representing Bushfire-style main stage programming.', 'main-fire-stage-collective-test', 'https://www.bush-fire.com/wp-content/uploads/2024/10/cropped-MTN-BUSHFIRE-2025.jpg'),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', 'Luju Culinary Showcase', 'Fixture artist/host entry for food, fashion, culture and music layout testing.', 'luju-culinary-showcase-test', 'https://lujufestival.com/wp-content/uploads/2024/06/Luju-Festival.jpg'),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000101', 'Makoti Cultural Ensemble', 'Fixture artist representing a traditional and contemporary cultural festival programme.', 'makoti-cultural-ensemble-test', 'https://www.makotifestival.com/wp-content/uploads/2024/01/makoti-festival.jpg')
on conflict (id) do update set
  org_id = excluded.org_id,
  name = excluded.name,
  bio = excluded.bio,
  slug = excluded.slug,
  image_url = excluded.image_url,
  updated_at = now();

commit;;
