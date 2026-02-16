
-- Add start_date and end_date to projects
ALTER TABLE public.projects
  ADD COLUMN start_date date,
  ADD COLUMN end_date date;

-- Create project-files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true);

-- Storage policies for project files
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Project files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files');

CREATE POLICY "Users can update own project files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own project files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
