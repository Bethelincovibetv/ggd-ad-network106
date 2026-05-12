
ALTER TABLE public.syndicate_tasks
  ADD COLUMN IF NOT EXISTS approval_mode TEXT NOT NULL DEFAULT 'manual';

INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description) VALUES
  ('slides', 'Slide Carousel', true, 'Homepage slide carousel'),
  ('ads', 'Banner Ads', true, 'Banner ad display rotator'),
  ('tasks', 'Activity Feed / Tasks', true, 'Normal task system for users'),
  ('premium_upgrade', 'Premium Upgrade', true, 'Premium membership upgrade page'),
  ('marketing_apps', 'Marketing Apps', true, 'Marketing apps page'),
  ('marketplace', 'Marketplace', true, 'Apps marketplace tab'),
  ('promotional_content', 'Promotional Content', true, 'Promote & earn page'),
  ('business_tasks', 'Business / Syndicate Campaigns', true, 'Businesses creating syndicate tasks'),
  ('syndicate', 'Syndicate Network', true, 'Syndicate dashboard, wallet & onboarding'),
  ('directory', 'Business Directory', true, 'Public business storefront directory'),
  ('paystack_payments', 'Paystack Payments', true, 'Paystack payment integration on storefronts'),
  ('api_keys', 'Developer API Keys', true, 'API key management for developers'),
  ('co_owner_upgrade', 'Co-Owner Upgrade', true, 'Co-owner upgrade flow'),
  ('community_feed', 'Community Feed', true, 'Social community feed'),
  ('referrals', 'Referrals Program', true, 'Referral & rewards program'),
  ('blog_generator', 'Blog Generator', true, 'AI blog post generator'),
  ('ebook_generator', 'Ebook Generator', true, 'AI ebook generator'),
  ('sales_funnel', 'Sales Funnel Generator', true, 'AI sales funnel generator'),
  ('ai_chat', 'AI Chat Assistant', true, 'In-app AI chat assistant'),
  ('voice_welcome', 'Voice Welcome', true, 'Voice welcome on first login')
ON CONFLICT (feature_key) DO NOTHING;
