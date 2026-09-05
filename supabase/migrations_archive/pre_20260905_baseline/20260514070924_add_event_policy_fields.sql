alter table public.events
  add column if not exists refund_policy text,
  add column if not exists attendee_fields jsonb not null default '[]'::jsonb,
  add column if not exists confirmation_message text;

comment on column public.events.refund_policy is 'Organizer-defined refund policy shown during checkout and on tickets.';
comment on column public.events.attendee_fields is 'JSON array of extra attendee field labels requested during checkout.';
comment on column public.events.confirmation_message is 'Organizer-defined message shown after successful purchase.';;
