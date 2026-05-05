
-- Business add-ons table
CREATE TABLE public.business_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage addons" ON public.business_addons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active addons" ON public.business_addons FOR SELECT TO authenticated
  USING (is_active = true);

-- User addon purchases
CREATE TABLE public.user_addon_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  addon_id UUID NOT NULL REFERENCES public.business_addons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, addon_id)
);

ALTER TABLE public.user_addon_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.user_addon_purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own purchases" ON public.user_addon_purchases FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all purchases" ON public.user_addon_purchases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
