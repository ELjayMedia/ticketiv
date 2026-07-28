-- TICK-348: keep POS shift audit rows inside the shared audit_action enum.
--
-- The POS shift migration originally wrote semantic action strings (`open`,
-- `close`, `pos_sale`) directly into audit_log.action. Live audit_log.action is
-- the shared audit_action enum (`insert`, `update`, `delete`, `login`,
-- `logout`, `other`), so those RPCs fail at runtime before a cashier can open
-- a shift or complete a shift-attributed sale. The sale RPC also selected a
-- table-returning function into jsonb, which fails before payment creation.
-- Preserve the semantic labels in changes.event_type, use `other` for the enum
-- action, build the POS charge result JSON from explicit returned columns, and
-- let POS fill buyer contact fields that were still null.

create or replace function public.prevent_buyer_contact_update()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
begin
  if tg_op = 'UPDATE' then
    if old.buyer_email is not null and old.buyer_email is distinct from new.buyer_email then
      raise exception 'buyer_email and buyer_phone are immutable once set';
    end if;

    if old.buyer_phone is not null and old.buyer_phone is distinct from new.buyer_phone then
      raise exception 'buyer_email and buyer_phone are immutable once set';
    end if;
  end if;

  return new;
end;
$function$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.fn_open_pos_shift(uuid,uuid,uuid,integer,text)'::regprocedure)
    into v_definition;

  v_definition := replace(
    v_definition,
    E'    ''open'',\n    jsonb_build_object(\n      ''opening_cash_cents''',
    E'    ''other'',\n    jsonb_build_object(\n      ''event_type'', ''pos_shift_open'',\n      ''opening_cash_cents'''
  );

  execute v_definition;

  select pg_get_functiondef('public.fn_close_pos_shift(uuid,integer,text)'::regprocedure)
    into v_definition;

  v_definition := replace(
    v_definition,
    E'    ''close'',\n    jsonb_build_object(\n      ''expected_cash_cents''',
    E'    ''other'',\n    jsonb_build_object(\n      ''event_type'', ''pos_shift_close'',\n      ''expected_cash_cents'''
  );

  execute v_definition;

  select pg_get_functiondef('public.fn_pos_charge_unchecked(uuid,jsonb,text,text,text,text)'::regprocedure)
    into v_definition;

  v_definition := replace(
    v_definition,
    E'  select public.fn_create_inventory_protected_order(\n    p_event_id  := p_event_id,\n    p_buyer_id  := v_caller,\n    p_buyer_email := coalesce(p_buyer_email, ''''),\n    p_items     := p_items,\n    p_holder_name := p_buyer_name\n  ) into v_created;',
    E'  select jsonb_build_object(\n           ''order_row'', created.order_row,\n           ''order_items'', created.order_items\n         )\n    into v_created\n  from public.fn_create_inventory_protected_order(\n    p_event_id  := p_event_id,\n    p_buyer_id  := v_caller,\n    p_buyer_email := coalesce(p_buyer_email, ''''),\n    p_items     := p_items,\n    p_holder_name := p_buyer_name\n  ) as created;'
  );

  execute v_definition;

  select pg_get_functiondef('public.fn_pos_charge_with_shift(uuid,uuid,jsonb,text,text,text,text)'::regprocedure)
    into v_definition;

  v_definition := replace(
    v_definition,
    E'    ''pos_sale'',\n    jsonb_build_object(\n      ''pos_shift_id''',
    E'    ''other'',\n    jsonb_build_object(\n      ''event_type'', ''pos_sale'',\n      ''pos_shift_id'''
  );

  execute v_definition;
end;
$$;
