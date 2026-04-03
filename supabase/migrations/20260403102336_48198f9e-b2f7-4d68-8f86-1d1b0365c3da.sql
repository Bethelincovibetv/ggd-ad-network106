
-- Business categories table
CREATE TABLE public.business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT 'Store',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON public.business_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage categories" ON public.business_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add fields to business_profiles
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.business_categories(id),
  ADD COLUMN IF NOT EXISTS whatsapp_group_link text,
  ADD COLUMN IF NOT EXISTS paystack_public_key text,
  ADD COLUMN IF NOT EXISTS paystack_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS address text;

-- Business listings table (products/services)
CREATE TABLE public.business_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  image_url text,
  is_featured boolean DEFAULT false,
  featured_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings" ON public.business_listings FOR SELECT USING (is_active = true);
CREATE POLICY "Users can manage own listings" ON public.business_listings FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage all listings" ON public.business_listings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default categories
INSERT INTO public.business_categories (name, icon, sort_order) VALUES
  ('Fashion & Clothing', 'Shirt', 1),
  ('Food & Beverages', 'UtensilsCrossed', 2),
  ('Technology & Gadgets', 'Smartphone', 3),
  ('Health & Beauty', 'Heart', 4),
  ('Education & Training', 'GraduationCap', 5),
  ('Real Estate', 'Home', 6),
  ('Transportation & Logistics', 'Truck', 7),
  ('Agriculture', 'Leaf', 8),
  ('Entertainment & Events', 'Music', 9),
  ('Finance & Insurance', 'Landmark', 10),
  ('Construction & Building', 'Hammer', 11),
  ('Digital Services', 'Globe', 12),
  ('Retail & Wholesale', 'ShoppingCart', 13),
  ('Hospitality & Tourism', 'Hotel', 14),
  ('Other', 'MoreHorizontal', 15);

-- Insert feature toggles
INSERT INTO public.feature_toggles (feature_key, feature_name, description, is_enabled) VALUES
  ('business_directory', 'Business Directory', 'Toggle the business listing directory on/off', true),
  ('paystack_payments', 'Paystack Payments', 'Allow businesses to receive payments via Paystack', false)
ON CONFLICT DO NOTHING;
