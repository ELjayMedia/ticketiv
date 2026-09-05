-- TICK-181: five tables carry two identical updated_at triggers (both just set
-- NEW.updated_at = now()). Drop the redundant t_<table>_touch duplicates and keep
-- the <table>_set_updated_at trigger on each. The set_updated_at / touch_updated_at
-- functions are left in place (still used by other tables).

drop trigger if exists t_artists_touch on public.artists;
drop trigger if exists t_event_dates_touch on public.event_dates;
drop trigger if exists t_order_items_touch on public.order_items;
drop trigger if exists t_seats_touch on public.seats;
drop trigger if exists t_ticket_types_touch on public.ticket_types;;
