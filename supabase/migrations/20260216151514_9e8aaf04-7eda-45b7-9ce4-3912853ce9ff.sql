
-- Create model_annotations table for BIM viewer annotations
CREATE TABLE public.model_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position_x DOUBLE PRECISION NOT NULL,
  position_y DOUBLE PRECISION NOT NULL,
  position_z DOUBLE PRECISION NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_annotations ENABLE ROW LEVEL SECURITY;

-- Builders can manage annotations on their projects
CREATE POLICY "Builders can insert annotations"
ON public.model_annotations FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = model_annotations.project_id AND projects.builder_id = auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Builders can view annotations on own projects"
ON public.model_annotations FOR SELECT
USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = model_annotations.project_id AND projects.builder_id = auth.uid())
);

CREATE POLICY "Builders can delete own annotations"
ON public.model_annotations FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Builders can update own annotations"
ON public.model_annotations FOR UPDATE
USING (auth.uid() = user_id);

-- Accepted contractors can view and add annotations
CREATE POLICY "Accepted contractors can view annotations"
ON public.model_annotations FOR SELECT
USING (
  EXISTS (SELECT 1 FROM quotes WHERE quotes.project_id = model_annotations.project_id AND quotes.contractor_id = auth.uid() AND quotes.status = 'accepted')
);

CREATE POLICY "Accepted contractors can insert annotations"
ON public.model_annotations FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM quotes WHERE quotes.project_id = model_annotations.project_id AND quotes.contractor_id = auth.uid() AND quotes.status = 'accepted')
  AND auth.uid() = user_id
);

-- Timestamp trigger
CREATE TRIGGER update_model_annotations_updated_at
BEFORE UPDATE ON public.model_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
