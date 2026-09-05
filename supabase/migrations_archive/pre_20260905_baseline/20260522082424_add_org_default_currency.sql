
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'SZL';

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_default_currency_check
  CHECK (default_currency ~ '^[A-Z]{3}$');
;
