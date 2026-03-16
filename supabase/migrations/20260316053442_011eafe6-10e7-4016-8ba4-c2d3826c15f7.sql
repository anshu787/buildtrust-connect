
-- Messages table for real-time chat
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Builders can view messages on their own projects
CREATE POLICY "Builders can view project messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE projects.id = messages.project_id AND projects.builder_id = auth.uid()
  ));

-- Accepted contractors can view messages on awarded projects
CREATE POLICY "Contractors can view project messages"
  ON public.messages FOR SELECT TO authenticated
  USING (is_accepted_contractor(project_id, auth.uid()));

-- Builders can insert messages on their own projects
CREATE POLICY "Builders can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = messages.project_id AND projects.builder_id = auth.uid())
  );

-- Accepted contractors can insert messages
CREATE POLICY "Contractors can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND is_accepted_contractor(project_id, auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
