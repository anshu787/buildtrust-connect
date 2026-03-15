-- Allow anyone authenticated to view any profile (for public profiles)
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow anyone authenticated to view reviews for public profiles
DROP POLICY IF EXISTS "Users can view relevant reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);
