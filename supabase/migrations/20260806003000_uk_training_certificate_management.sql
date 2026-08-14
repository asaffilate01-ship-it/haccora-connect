-- Phase 13: UK-only training catalogue and externally issued certificate metadata.
ALTER TABLE public.training_records
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS certificate_reference text;

ALTER TABLE public.training_records
  DROP CONSTRAINT IF EXISTS training_records_external_metadata_length;
ALTER TABLE public.training_records
  ADD CONSTRAINT training_records_external_metadata_length CHECK (
    (course_name IS NULL OR char_length(course_name) BETWEEN 2 AND 160)
    AND (provider IS NULL OR char_length(provider) BETWEEN 2 AND 160)
    AND (certificate_reference IS NULL OR char_length(certificate_reference) <= 120)
  );

-- An earlier migration attached touch_updated_at to the catalogue before the
-- table had the matching column. Add it before the first catalogue update so
-- both fresh installs and existing environments remain upgradeable.
ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Preserve IDs and completed records while replacing Germany-only catalogue content.
UPDATE public.training_courses
SET title_de = 'Food-handler health and fitness to work',
    title_en = 'Food-handler health and fitness to work',
    minutes = 25,
    modules = 4,
    required = true
WHERE title_en ILIKE '%IfSG%' OR title_de ILIKE '%IfSG%';

UPDATE public.training_courses
SET title_de = 'HACCP fundamentals', title_en = 'HACCP fundamentals'
WHERE title_en = 'HACCP fundamentals' OR title_de = 'HACCP-Grundlagen';

UPDATE public.training_courses
SET title_de = 'Allergen awareness and PPDS',
    title_en = 'Allergen awareness and PPDS'
WHERE title_en ILIKE 'Allergens (%' OR title_de ILIKE 'Allergene (%';

UPDATE public.training_courses
SET title_de = 'Kitchen hygiene and cleaning', title_en = 'Kitchen hygiene and cleaning'
WHERE title_en = 'Kitchen hygiene & cleaning' OR title_de = 'Küchenhygiene & Reinigung';

UPDATE public.training_courses
SET title_de = 'Workplace safety', title_en = 'Workplace safety'
WHERE title_en = 'Workplace safety' OR title_de = 'Arbeitssicherheit';

COMMENT ON COLUMN public.training_records.course_name IS
  'External or bespoke UK training title when no catalogue course is selected.';
COMMENT ON COLUMN public.training_records.provider IS
  'Training provider shown on the supporting certificate.';
COMMENT ON COLUMN public.training_records.certificate_reference IS
  'Optional provider certificate number or reference.';
