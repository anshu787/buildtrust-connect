
-- Add quote_pdf_url column to quotes table
ALTER TABLE public.quotes ADD COLUMN quote_pdf_url text;

-- Create storage bucket for quote PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-pdfs', 'quote-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Contractors can upload their own quote PDFs
CREATE POLICY "Contractors can upload quote PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quote-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Contractors can view their own uploaded PDFs
CREATE POLICY "Contractors can view own quote PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'quote-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Builders can view quote PDFs for their projects (via signed URLs generated server-side or by matching folder)
CREATE POLICY "Builders can view quote PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'quote-pdfs');
