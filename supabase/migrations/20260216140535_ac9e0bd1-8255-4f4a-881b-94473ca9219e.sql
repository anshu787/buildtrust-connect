
-- Create project_files table to track uploaded files with milestone associations
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('ifc', 'drawing', 'photo', 'document')),
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Builders can manage files on their projects
CREATE POLICY "Builders can insert project files"
ON public.project_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid()
  )
);

CREATE POLICY "Builders can view own project files"
ON public.project_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid()
  )
);

CREATE POLICY "Builders can update own project files"
ON public.project_files FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid()
  )
);

CREATE POLICY "Builders can delete own project files"
ON public.project_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid()
  )
);

-- Contractors with accepted quotes can view project files
CREATE POLICY "Accepted contractors can view project files"
ON public.project_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.project_id = project_files.project_id
    AND quotes.contractor_id = auth.uid()
    AND quotes.status = 'accepted'
  )
);

-- Anyone authenticated can view files for open projects
CREATE POLICY "Authenticated users can view open project files"
ON public.project_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.status = 'open'
  )
);
