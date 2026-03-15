-- Allow authenticated users to view any user's role (needed for public profiles)
CREATE POLICY "Anyone can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);
