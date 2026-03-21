
CREATE TABLE public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('deposit', 'release')),
  tx_hash TEXT NOT NULL,
  amount_eth TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view escrow transactions"
  ON public.escrow_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert escrow transactions"
  ON public.escrow_transactions FOR INSERT TO authenticated WITH CHECK (true);
