
-- Drop the overly permissive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;

-- Recreate with folder-based ownership check: user can only upload to their own folder
CREATE POLICY "Users can upload to own folder in project-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
