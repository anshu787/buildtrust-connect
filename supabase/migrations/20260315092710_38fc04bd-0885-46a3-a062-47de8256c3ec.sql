
-- Allow builders to update quotes on their own projects (for award/reject flow)
CREATE POLICY "Builders can update quotes on own projects"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = quotes.project_id
    AND projects.builder_id = auth.uid()
  )
);

-- Create reviews/ratings table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users can view reviews about them or on their projects
CREATE POLICY "Users can view relevant reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  reviewer_id = auth.uid()
  OR reviewee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM projects WHERE projects.id = reviews.project_id AND projects.builder_id = auth.uid()
  )
);

-- Authenticated users can insert reviews on completed projects they participated in
CREATE POLICY "Users can insert reviews on completed projects"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = reviews.project_id
    AND projects.status = 'completed'
    AND (
      projects.builder_id = auth.uid()
      OR is_accepted_contractor(projects.id, auth.uid())
    )
  )
);
