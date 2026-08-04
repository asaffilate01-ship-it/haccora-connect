-- UK-only runtime defaults for newly created organizations and locations.
ALTER TABLE public.organizations ALTER COLUMN timezone SET DEFAULT 'Europe/London';
ALTER TABLE public.locations ALTER COLUMN timezone SET DEFAULT 'Europe/London';

UPDATE public.organizations SET timezone = 'Europe/London' WHERE timezone = 'Europe/Berlin';
UPDATE public.locations SET timezone = 'Europe/London' WHERE timezone = 'Europe/Berlin';
