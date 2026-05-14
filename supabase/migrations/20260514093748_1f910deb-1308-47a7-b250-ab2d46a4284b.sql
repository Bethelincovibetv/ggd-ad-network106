-- Seed business categories and grant admin to bethelgoodgift3@gmail.com
INSERT INTO public.business_categories (name, icon, sort_order) VALUES
  ('Fashion & Apparel', 'Shirt', 1),
  ('Food & Restaurants', 'UtensilsCrossed', 2),
  ('Beauty & Cosmetics', 'Sparkles', 3),
  ('Health & Wellness', 'HeartPulse', 4),
  ('Electronics & Gadgets', 'Smartphone', 5),
  ('Home & Furniture', 'Sofa', 6),
  ('Education & Training', 'GraduationCap', 7),
  ('Real Estate', 'Building2', 8),
  ('Automotive', 'Car', 9),
  ('Travel & Tourism', 'Plane', 10),
  ('Entertainment & Events', 'PartyPopper', 11),
  ('Professional Services', 'Briefcase', 12),
  ('Agriculture & Farming', 'Wheat', 13),
  ('Arts & Crafts', 'Palette', 14),
  ('Sports & Fitness', 'Dumbbell', 15),
  ('Technology & Software', 'Code', 16),
  ('Finance & Insurance', 'Landmark', 17),
  ('Logistics & Delivery', 'Truck', 18),
  ('Media & Marketing', 'Megaphone', 19),
  ('Other', 'Store', 99)
ON CONFLICT DO NOTHING;

-- Backfill admin role for the second admin email if user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'bethelgoodgift3@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;