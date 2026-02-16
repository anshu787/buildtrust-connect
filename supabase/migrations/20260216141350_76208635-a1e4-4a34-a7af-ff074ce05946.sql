
-- Add wallet_address to profiles for MetaMask connection
ALTER TABLE public.profiles ADD COLUMN wallet_address TEXT;
