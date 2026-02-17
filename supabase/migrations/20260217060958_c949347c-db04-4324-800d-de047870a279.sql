
-- Create a security definer function to check if a contractor has an accepted quote
CREATE OR REPLACE FUNCTION public.is_accepted_contractor(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quotes
    WHERE project_id = _project_id
      AND contractor_id = _user_id
      AND status = 'accepted'
  )
$$;

-- Fix projects: replace the recursive policy
DROP POLICY IF EXISTS "Contractors can view awarded projects" ON public.projects;
CREATE POLICY "Contractors can view awarded projects"
ON public.projects FOR SELECT
USING (public.is_accepted_contractor(id, auth.uid()));

-- Fix milestones: replace the recursive policy
DROP POLICY IF EXISTS "Project participants can view milestones" ON public.milestones;
CREATE POLICY "Project participants can view milestones"
ON public.milestones FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.builder_id = auth.uid()))
  OR public.is_accepted_contractor(project_id, auth.uid())
);

-- Fix project_files: replace recursive policies
DROP POLICY IF EXISTS "Accepted contractors can view project files" ON public.project_files;
CREATE POLICY "Accepted contractors can view project files"
ON public.project_files FOR SELECT
USING (public.is_accepted_contractor(project_id, auth.uid()));

-- Fix model_annotations: replace recursive policies
DROP POLICY IF EXISTS "Accepted contractors can view annotations" ON public.model_annotations;
CREATE POLICY "Accepted contractors can view annotations"
ON public.model_annotations FOR SELECT
USING (public.is_accepted_contractor(project_id, auth.uid()));

DROP POLICY IF EXISTS "Accepted contractors can insert annotations" ON public.model_annotations;
CREATE POLICY "Accepted contractors can insert annotations"
ON public.model_annotations FOR INSERT
WITH CHECK (
  public.is_accepted_contractor(project_id, auth.uid())
  AND auth.uid() = user_id
);
