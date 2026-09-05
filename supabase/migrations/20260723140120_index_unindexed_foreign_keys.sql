create index if not exists idx_device_setup_codes_claimed_device_id
  on public.device_setup_codes (claimed_device_id);
create index if not exists idx_device_setup_codes_created_by
  on public.device_setup_codes (created_by);
create index if not exists idx_device_setup_codes_event_id
  on public.device_setup_codes (event_id);

create index if not exists idx_orders_device_session_id
  on public.orders (device_session_id);

create index if not exists idx_pos_shifts_cashier_user_id
  on public.pos_shifts (cashier_user_id);
create index if not exists idx_pos_shifts_closed_by
  on public.pos_shifts (closed_by);
create index if not exists idx_pos_shifts_device_session_id
  on public.pos_shifts (device_session_id);
create index if not exists idx_pos_shifts_opened_by
  on public.pos_shifts (opened_by);;
