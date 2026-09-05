-- C3: Editorial curation knob for the discover home "Editor's pick" hero
-- and any other featured surface. Higher priority wins; ties broken by
-- start time ascending. NULL means "not featured".

alter table public.events
  add column if not exists featured_priority integer
    check (featured_priority is null or featured_priority between 0 and 1000);

create index if not exists idx_events_featured_priority
  on public.events(featured_priority desc nulls last, starts_at asc)
  where featured_priority is not null;

comment on column public.events.featured_priority is
  'Editorial curation rank. NULL = not featured. Higher value = higher rank.';
;
