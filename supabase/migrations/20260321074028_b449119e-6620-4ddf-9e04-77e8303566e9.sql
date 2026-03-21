-- Drop the unique constraint on milestone_id so both builder and contractor can mint for same project
ALTER TABLE public.nft_certificates DROP CONSTRAINT IF EXISTS nft_certificates_milestone_id_fkey;
ALTER TABLE public.nft_certificates DROP CONSTRAINT IF EXISTS nft_certificates_milestone_id_key;

-- Change milestone_id to text type to support role-prefixed IDs (e.g. "builder-<uuid>")
ALTER TABLE public.nft_certificates ALTER COLUMN milestone_id TYPE text USING milestone_id::text;