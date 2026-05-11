
CREATE TABLE public.task_share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE DEFAULT substring(replace(gen_random_uuid()::text,'-',''),1,8),
  task_id UUID NOT NULL,
  sharer_user_id UUID NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, sharer_user_id)
);
ALTER TABLE public.task_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read share links" ON public.task_share_links FOR SELECT USING (true);
CREATE POLICY "Users create own share links" ON public.task_share_links FOR INSERT TO authenticated WITH CHECK (sharer_user_id = auth.uid());
CREATE POLICY "Anon can increment clicks" ON public.task_share_links FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage share links" ON public.task_share_links FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.task_share_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID NOT NULL REFERENCES public.task_share_links(id) ON DELETE CASCADE,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_share_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a click" ON public.task_share_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Sharer can view own clicks" ON public.task_share_clicks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.task_share_links sl WHERE sl.id = share_link_id AND sl.sharer_user_id = auth.uid())
);
CREATE POLICY "Task creator can view clicks" ON public.task_share_clicks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.task_share_links sl JOIN public.tasks t ON t.id = sl.task_id WHERE sl.id = share_link_id AND t.creator_id = auth.uid())
);
CREATE POLICY "Admin view all clicks" ON public.task_share_clicks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_task_share_clicks_link ON public.task_share_clicks(share_link_id);
CREATE INDEX idx_task_share_links_task ON public.task_share_links(task_id);
