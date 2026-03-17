
-- Add attachment columns to messages table
ALTER TABLE public.messages
  ADD COLUMN file_url text DEFAULT NULL,
  ADD COLUMN file_name text DEFAULT NULL,
  ADD COLUMN file_type text DEFAULT NULL;

-- Create a storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: builders can upload to their project folders
CREATE POLICY "Builders can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id::text = (storage.foldername(name))[1]
      AND projects.builder_id = auth.uid()
  )
);

-- Contractors can upload to project folders they're accepted on
CREATE POLICY "Contractors can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND is_accepted_contractor((storage.foldername(name))[1]::uuid, auth.uid())
);

-- Builders can view chat attachments for their projects
CREATE POLICY "Builders can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id::text = (storage.foldername(name))[1]
      AND projects.builder_id = auth.uid()
  )
);

-- Contractors can view chat attachments for accepted projects
CREATE POLICY "Contractors can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND is_accepted_contractor((storage.foldername(name))[1]::uuid, auth.uid())
);
