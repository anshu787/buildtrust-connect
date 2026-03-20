
-- Add milestone workflow columns
ALTER TABLE public.milestones
  ADD COLUMN submitted_at timestamptz DEFAULT NULL,
  ADD COLUMN approved_at timestamptz DEFAULT NULL,
  ADD COLUMN rejection_comment text DEFAULT NULL;

-- Allow contractors to update milestone status (submit for review)
CREATE POLICY "Contractors can submit milestones"
ON public.milestones FOR UPDATE TO authenticated
USING (is_accepted_contractor(project_id, auth.uid()))
WITH CHECK (is_accepted_contractor(project_id, auth.uid()));
