-- Allow contractors to view projects where they have an accepted quote
CREATE POLICY "Contractors can view awarded projects"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.project_id = projects.id
      AND quotes.contractor_id = auth.uid()
      AND quotes.status = 'accepted'
  )
);