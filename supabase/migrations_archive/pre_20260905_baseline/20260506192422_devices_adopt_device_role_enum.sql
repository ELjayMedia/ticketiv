-- Pass 2.C: adopt the existing device_role enum on public.devices
-- (replaces the app_role overload). Also collapses two duplicate validator functions.

-- 1. Add new column with sensible default
ALTER TABLE public.devices
  ADD COLUMN device_role public.device_role NOT NULL DEFAULT 'scanner_unassigned';

-- 2. Backfill (defensive — currently 0 rows)
UPDATE public.devices
   SET device_role = CASE
     WHEN role::text = 'pos'                         THEN 'organizer_pos'::public.device_role
     WHEN role::text IN ('scanner', 'organizer_scanner') THEN 'organizer_scanner'::public.device_role
     ELSE 'scanner_unassigned'::public.device_role
   END;

-- 3. Drop both old triggers and the duplicated functions
DROP TRIGGER IF EXISTS trg_devices_require_event_for_scanner ON public.devices;
DROP TRIGGER IF EXISTS trg_devices_scanner_guard            ON public.devices;
DROP FUNCTION IF EXISTS public.fn_validate_device_scanner();
DROP FUNCTION IF EXISTS public.fn_require_event_for_scanner();

-- 4. Drop the role column (no policies/functions reference it now that the triggers are gone)
ALTER TABLE public.devices DROP COLUMN role;

-- 5. Consolidated guard. Only assigned scanners must reference event_id;
--    scanner_unassigned is permitted without event_id by design.
CREATE OR REPLACE FUNCTION public.fn_devices_require_event_for_scanner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.device_role = 'organizer_scanner'::public.device_role AND NEW.event_id IS NULL THEN
    RAISE EXCEPTION 'Assigned scanner devices (organizer_scanner) must reference an event_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_devices_require_event_for_scanner
  BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_devices_require_event_for_scanner();

COMMENT ON COLUMN public.devices.device_role IS
  'Role of this physical device. organizer_scanner = assigned to an event (event_id required); scanner_unassigned = not yet assigned; organizer_pos = POS terminal; organizer_kiosk = kiosk.';;
