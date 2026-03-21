CREATE TABLE public.nft_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  minter_address text NOT NULL,
  token_id text NOT NULL,
  tx_hash text NOT NULL,
  contract_address text NOT NULL,
  minted_at timestamp with time zone NOT NULL DEFAULT now(),
  milestone_title text NOT NULL,
  project_title text NOT NULL,
  minter_user_id uuid NOT NULL,
  UNIQUE(milestone_id)
);

ALTER TABLE public.nft_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view nft certificates" ON public.nft_certificates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert nft certificates" ON public.nft_certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = minter_user_id);