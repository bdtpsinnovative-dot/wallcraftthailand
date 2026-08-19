-- Keeps visit-plan trash state separate from the existing status constraint.
ALTER TABLE public.visit_plans
  ADD COLUMN IF NOT EXISTS is_deleted boolean;

UPDATE public.visit_plans
SET is_deleted = false
WHERE is_deleted IS NULL;

ALTER TABLE public.visit_plans
  ALTER COLUMN is_deleted SET DEFAULT false,
  ALTER COLUMN is_deleted SET NOT NULL;

CREATE INDEX IF NOT EXISTS visit_plans_is_deleted_idx
  ON public.visit_plans (is_deleted);
