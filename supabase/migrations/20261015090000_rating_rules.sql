-- Who may rate whom. The admin keeps a list of rules such as
--   "Sales Manager can rate Site Engineer"            (target: a designation)
--   "Production Supervisor can rate department Production" (target: a whole department)
-- A rating is given by the signed-in person (their login's linked employee). Admins may rate
-- anyone; everyone else only the people a rule covers. Names are compared ignoring case and
-- extra spaces.

CREATE TABLE public.rating_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_designation text NOT NULL CHECK (trim(rater_designation) <> ''),
  target_kind text NOT NULL CHECK (target_kind IN ('designation', 'department')),
  target text NOT NULL CHECK (trim(target) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rating_rules_unique_idx
  ON public.rating_rules (lower(trim(rater_designation)), target_kind, lower(trim(target)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rating_rules TO authenticated;
GRANT ALL ON public.rating_rules TO service_role;
REVOKE ALL ON public.rating_rules FROM anon;

ALTER TABLE public.rating_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.rating_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "add" ON public.rating_rules FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "change" ON public.rating_rules FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "remove" ON public.rating_rules FOR DELETE TO authenticated USING (public.is_admin());

INSERT INTO public.rating_rules (rater_designation, target_kind, target) VALUES
  ('Sales Manager', 'designation', 'Site Engineer'),
  ('Production Supervisor', 'department', 'Production'),
  ('Senior Designer', 'designation', 'Jr Designer')
ON CONFLICT DO NOTHING;

-- Who gave the rating, by employee id (the name stays in rated_by for display).
ALTER TABLE public.employee_ratings
  ADD COLUMN rated_by_id text REFERENCES public.employees (id) ON DELETE SET NULL;

-- May the signed-in person rate this employee?
CREATE OR REPLACE FUNCTION public.can_rate(p_employee text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1
    FROM employees rater
    JOIN employees target ON target.id = p_employee
    JOIN rating_rules r
      ON lower(trim(r.rater_designation)) = lower(trim(rater.designation))
    WHERE rater.id = public.my_employee_id()
      AND rater.active
      AND target.active
      AND target.id <> rater.id
      AND CASE r.target_kind
            WHEN 'designation' THEN lower(trim(r.target)) = lower(trim(target.designation))
            ELSE lower(trim(r.target)) = lower(trim(coalesce(target.department, '')))
          END
  );
$$;
REVOKE ALL ON FUNCTION public.can_rate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_rate(text) TO authenticated;

-- Rating: only through the rules, and only in your own name (admins may rate as themselves
-- without a linked employee).
DROP POLICY "add" ON public.employee_ratings;
CREATE POLICY "add" ON public.employee_ratings FOR INSERT TO authenticated
  WITH CHECK (
    public.can_rate(employee_id)
    AND (rated_by_id IS NOT DISTINCT FROM public.my_employee_id() OR public.is_admin())
  );

-- Field staff who rate others also see those people and the ratings they gave.
DROP POLICY "read" ON public.employees;
CREATE POLICY "read" ON public.employees FOR SELECT TO authenticated
  USING (public.full_view() OR id = public.my_employee_id() OR public.can_rate(id));

DROP POLICY "read" ON public.employee_ratings;
CREATE POLICY "read" ON public.employee_ratings FOR SELECT TO authenticated
  USING (
    public.full_view()
    OR employee_id = public.my_employee_id()
    OR rated_by_id = public.my_employee_id()
  );

SELECT public.audit_enable('public.rating_rules');
