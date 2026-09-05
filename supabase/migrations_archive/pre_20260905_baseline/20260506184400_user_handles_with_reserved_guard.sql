-- 4/6: Public-facing user handles (e.g. @lethu) used in URLs, friend search, mentions.

CREATE TABLE public.user_handles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_handles_handle_format
    CHECK (handle ~ '^[a-z0-9][a-z0-9_]{2,29}$' AND handle = lower(handle))
);

CREATE UNIQUE INDEX user_handles_handle_unique ON public.user_handles (handle);

ALTER TABLE public.user_handles ENABLE ROW LEVEL SECURITY;

-- Handles are public; anyone can read
CREATE POLICY user_handles_select_all ON public.user_handles
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY user_handles_insert_self ON public.user_handles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_handles_update_self ON public.user_handles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_handles_delete_self ON public.user_handles
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Reserved handle guard + auto-update updated_at
CREATE OR REPLACE FUNCTION public.fn_check_reserved_handle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  reserved_list text[] := ARRAY[
    'admin','administrator','root','support','help','about','terms','privacy','contact',
    'login','signup','signin','signout','logout','register','password','settings','profile',
    'search','my','home','app','api','www','mail','email','news','blog','docs','status',
    'ticketiv','eljaymedia','eljay','newsonafrica','eljaytunes','gudumart',
    'event','events','venue','venues','artist','artists','organizer','organizers',
    'ticket','tickets','order','orders','payment','payments','checkout','cart',
    'staff','team','company','careers','jobs','press','legal','cookies','sitemap'
  ];
BEGIN
  IF lower(NEW.handle) = ANY(reserved_list) THEN
    RAISE EXCEPTION 'Handle "%" is reserved', NEW.handle USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_user_handles_check_reserved
  BEFORE INSERT OR UPDATE OF handle ON public.user_handles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_reserved_handle();

COMMENT ON TABLE public.user_handles IS
  'Public user handles (e.g. @lethu). One per user. Used in URLs, mentions, friend search.';;
