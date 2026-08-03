-- UK operational records. Official FSA/FSS guidance remains authoritative.
CREATE TABLE public.safe_method_templates (
 id text PRIMARY KEY, title text NOT NULL, category text NOT NULL, summary text NOT NULL,
 prompts jsonb NOT NULL DEFAULT '[]', official_source_url text NOT NULL CHECK (official_source_url ~ '^https://'),
 version text NOT NULL, published_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.site_safe_methods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 location_id uuid NOT NULL, template_id text NOT NULL REFERENCES public.safe_method_templates(id),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','review_due','retired')),
 controls jsonb NOT NULL DEFAULT '{}', adopted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 adopted_at timestamptz, review_due_at date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (organization_id,location_id,template_id), FOREIGN KEY (organization_id,location_id) REFERENCES public.locations(organization_id,id) ON DELETE CASCADE);
CREATE TABLE public.daily_diary_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 location_id uuid NOT NULL, diary_date date NOT NULL DEFAULT current_date, opening_checks jsonb NOT NULL DEFAULT '{}', closing_checks jsonb NOT NULL DEFAULT '{}',
 problems text NOT NULL DEFAULT '', corrective_actions text NOT NULL DEFAULT '', signed_off_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 signed_off_at timestamptz, created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (organization_id,location_id,diary_date), FOREIGN KEY (organization_id,location_id) REFERENCES public.locations(organization_id,id) ON DELETE CASCADE,
 CHECK (problems = '' OR corrective_actions <> ''));
CREATE OR REPLACE FUNCTION public.guard_daily_diary_signoff() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.signed_off_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.signed_off_at IS NULL OR NEW.signed_off_at IS DISTINCT FROM OLD.signed_off_at) THEN
  IF NOT public.can_manage_organization(NEW.organization_id) THEN RAISE EXCEPTION 'manager sign-off required'; END IF;
  NEW.signed_off_by := auth.uid();
 END IF;
 IF TG_OP = 'UPDATE' AND OLD.signed_off_at IS NOT NULL AND (NEW.signed_off_at IS NULL OR NEW.signed_off_by IS DISTINCT FROM OLD.signed_off_by) THEN
  RAISE EXCEPTION 'signed diary records cannot be unsigned or reassigned';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_daily_diary_signoff BEFORE INSERT OR UPDATE ON public.daily_diary_entries FOR EACH ROW EXECUTE FUNCTION public.guard_daily_diary_signoff();
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS ingredient_statement text;
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS may_contain text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS specification_version text;
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE TABLE public.ppds_label_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, location_id uuid NOT NULL,
 recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL, product_name text NOT NULL, ingredient_statement text NOT NULL, allergens text[] NOT NULL DEFAULT '{}',
 source_snapshot jsonb NOT NULL, version integer NOT NULL DEFAULT 1, generated_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), generated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (organization_id,location_id) REFERENCES public.locations(organization_id,id) ON DELETE CASCADE);
INSERT INTO public.safe_method_templates (id,title,category,summary,prompts,official_source_url,version) VALUES
 ('cross-contamination','Prevent cross-contamination','cross_contamination','Document separation, handwashing and equipment controls.','["How are raw and ready-to-eat foods separated?","What happens when a control fails?"]','https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb','2026.1'),
 ('cleaning','Clean effectively','cleaning','Set what is cleaned, how, when and by whom.','["Which food-contact surfaces need disinfection?","How is completion evidenced?"]','https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb','2026.1'),
 ('chilling','Chilling controls','chilling','Record delivery, storage, cooling and display controls.','["What limits and checks apply?","What corrective action is taken?"]','https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb','2026.1'),
 ('cooking','Cooking controls','cooking','Define validated cooking, reheating and hot-holding controls.','["How is the control validated?","What happens after a failed check?"]','https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb','2026.1'),
 ('allergens','Allergen management','allergens','Control ingredient changes, communication, cross-contact and PPDS information.','["Who approves ingredient changes?","How is allergen information verified?"]','https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses','2026.1'),
 ('management','Management review','management','Assign ownership, train staff and review after operational changes.','["Who owns each control?","When will this method be reviewed?"]','https://www.food.gov.uk/business-guidance/managing-food-safety','2026.1');
ALTER TABLE public.safe_method_templates,public.site_safe_methods,public.daily_diary_entries,public.ppds_label_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY safe_method_templates_read ON public.safe_method_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY site_safe_methods_read ON public.site_safe_methods FOR SELECT TO authenticated USING (public.can_read_organization(organization_id));
CREATE POLICY site_safe_methods_manage ON public.site_safe_methods FOR ALL TO authenticated USING (public.can_manage_organization(organization_id)) WITH CHECK (public.can_manage_organization(organization_id));
CREATE POLICY daily_diary_read ON public.daily_diary_entries FOR SELECT TO authenticated USING (public.can_read_organization(organization_id));
CREATE POLICY daily_diary_write ON public.daily_diary_entries FOR ALL TO authenticated USING (public.can_read_organization(organization_id)) WITH CHECK (public.can_read_organization(organization_id));
CREATE POLICY ppds_labels_read ON public.ppds_label_versions FOR SELECT TO authenticated USING (public.can_read_organization(organization_id));
CREATE POLICY ppds_labels_manage ON public.ppds_label_versions FOR ALL TO authenticated USING (public.can_manage_organization(organization_id)) WITH CHECK (public.can_manage_organization(organization_id));
REVOKE ALL ON public.safe_method_templates,public.site_safe_methods,public.daily_diary_entries,public.ppds_label_versions FROM anon;
GRANT SELECT ON public.safe_method_templates TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.site_safe_methods,public.daily_diary_entries,public.ppds_label_versions TO authenticated;
REVOKE ALL ON FUNCTION public.guard_daily_diary_signoff() FROM PUBLIC;
