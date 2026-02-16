-- Fix: All SELECT policies are RESTRICTIVE (AND logic) but should be PERMISSIVE (OR logic)
-- This means ALL policies must pass simultaneously, which breaks access

-- ===== PROJECTS TABLE =====
DROP POLICY IF EXISTS "Anyone authenticated can view open projects" ON public.projects;
DROP POLICY IF EXISTS "Builders can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Contractors can view awarded projects" ON public.projects;
DROP POLICY IF EXISTS "Builders can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Builders can update own projects" ON public.projects;

CREATE POLICY "Anyone authenticated can view open projects" ON public.projects FOR SELECT TO authenticated USING (status = 'open');
CREATE POLICY "Builders can view own projects" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = builder_id);
CREATE POLICY "Contractors can view awarded projects" ON public.projects FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.project_id = projects.id AND quotes.contractor_id = auth.uid() AND quotes.status = 'accepted')
);
CREATE POLICY "Builders can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = builder_id AND has_role(auth.uid(), 'builder'));
CREATE POLICY "Builders can update own projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = builder_id);

-- ===== MILESTONES TABLE =====
DROP POLICY IF EXISTS "Project participants can view milestones" ON public.milestones;
DROP POLICY IF EXISTS "Builders can manage milestones" ON public.milestones;
DROP POLICY IF EXISTS "Builders can update milestones" ON public.milestones;

CREATE POLICY "Project participants can view milestones" ON public.milestones FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = milestones.project_id AND projects.builder_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.quotes WHERE quotes.project_id = milestones.project_id AND quotes.contractor_id = auth.uid() AND quotes.status = 'accepted')
);
CREATE POLICY "Builders can manage milestones" ON public.milestones FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = milestones.project_id AND projects.builder_id = auth.uid())
);
CREATE POLICY "Builders can update milestones" ON public.milestones FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = milestones.project_id AND projects.builder_id = auth.uid())
);

-- ===== QUOTES TABLE =====
DROP POLICY IF EXISTS "Builders can view quotes for their projects" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can view own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can update own quotes" ON public.quotes;

CREATE POLICY "Builders can view quotes for their projects" ON public.quotes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = quotes.project_id AND projects.builder_id = auth.uid())
);
CREATE POLICY "Contractors can view own quotes" ON public.quotes FOR SELECT TO authenticated USING (auth.uid() = contractor_id);
CREATE POLICY "Contractors can insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = contractor_id AND has_role(auth.uid(), 'contractor'));
CREATE POLICY "Contractors can update own quotes" ON public.quotes FOR UPDATE TO authenticated USING (auth.uid() = contractor_id);

-- ===== PROFILES TABLE =====
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ===== USER_ROLES TABLE =====
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== NOTIFICATIONS TABLE =====
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ===== PROJECT_FILES TABLE =====
DROP POLICY IF EXISTS "Builders can view own project files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can view open project files" ON public.project_files;
DROP POLICY IF EXISTS "Accepted contractors can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Builders can insert project files" ON public.project_files;
DROP POLICY IF EXISTS "Builders can update own project files" ON public.project_files;
DROP POLICY IF EXISTS "Builders can delete own project files" ON public.project_files;

CREATE POLICY "Builders can view own project files" ON public.project_files FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid())
);
CREATE POLICY "Authenticated users can view open project files" ON public.project_files FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_files.project_id AND projects.status = 'open')
);
CREATE POLICY "Accepted contractors can view project files" ON public.project_files FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.project_id = project_files.project_id AND quotes.contractor_id = auth.uid() AND quotes.status = 'accepted')
);
CREATE POLICY "Builders can insert project files" ON public.project_files FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid())
);
CREATE POLICY "Builders can update own project files" ON public.project_files FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid())
);
CREATE POLICY "Builders can delete own project files" ON public.project_files FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_files.project_id AND projects.builder_id = auth.uid())
);

-- ===== MODEL_ANNOTATIONS TABLE =====
DROP POLICY IF EXISTS "Builders can view annotations on own projects" ON public.model_annotations;
DROP POLICY IF EXISTS "Accepted contractors can view annotations" ON public.model_annotations;
DROP POLICY IF EXISTS "Builders can insert annotations" ON public.model_annotations;
DROP POLICY IF EXISTS "Accepted contractors can insert annotations" ON public.model_annotations;
DROP POLICY IF EXISTS "Builders can update own annotations" ON public.model_annotations;
DROP POLICY IF EXISTS "Builders can delete own annotations" ON public.model_annotations;

CREATE POLICY "Builders can view annotations on own projects" ON public.model_annotations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = model_annotations.project_id AND projects.builder_id = auth.uid())
);
CREATE POLICY "Accepted contractors can view annotations" ON public.model_annotations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.project_id = model_annotations.project_id AND quotes.contractor_id = auth.uid() AND quotes.status = 'accepted')
);
CREATE POLICY "Builders can insert annotations" ON public.model_annotations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = model_annotations.project_id AND projects.builder_id = auth.uid()) AND auth.uid() = user_id
);
CREATE POLICY "Accepted contractors can insert annotations" ON public.model_annotations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.project_id = model_annotations.project_id AND quotes.contractor_id = auth.uid() AND quotes.status = 'accepted') AND auth.uid() = user_id
);
CREATE POLICY "Builders can update own annotations" ON public.model_annotations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Builders can delete own annotations" ON public.model_annotations FOR DELETE TO authenticated USING (auth.uid() = user_id);