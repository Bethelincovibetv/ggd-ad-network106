CREATE POLICY "Anon can view active ads" ON public.ads FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Anon can insert events" ON public.ad_events FOR INSERT TO anon WITH CHECK (true);