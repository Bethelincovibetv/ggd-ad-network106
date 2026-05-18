DROP POLICY IF EXISTS "Anon can read settings" ON public.app_settings;
CREATE POLICY "Anon can read settings" ON public.app_settings FOR SELECT TO anon USING (true);