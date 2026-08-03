INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description) VALUES
  ('auto_approve_api_ads', 'API Ads Auto-Approve', true, 'ON: ads created via API go live instantly. OFF: require admin approval.'),
  ('create_post', 'Create: Community Post', true, 'Show Community Post in the Create menu'),
  ('create_credit_task', 'Create: Credit Task', true, 'Show Credit Task in the Create menu'),
  ('create_banner_ad', 'Create: Banner Advert', true, 'Show Banner Advert in the Create menu'),
  ('create_syndicate_campaign', 'Create: Premium Social Campaign', true, 'Show Premium Social/Syndicate Campaign in the Create menu'),
  ('nav_home', 'Menu: Home', true, 'Show Home in navigation'),
  ('nav_campaigns', 'Menu: My Campaigns', true, 'Show Campaign Manager in navigation'),
  ('nav_wallet', 'Menu: Wallet', true, 'Show Wallet in navigation'),
  ('nav_profile', 'Menu: My Profile', true, 'Show My Profile in navigation'),
  ('nav_inbox', 'Menu: GGD Inbox', true, 'Show Inbox in navigation'),
  ('nav_my_business', 'Menu: My Business', true, 'Show My Business in navigation'),
  ('nav_business_details', 'Menu: Business Details', true, 'Show Business Details in navigation'),
  ('nav_guide', 'Menu: Guide', true, 'Show Guide in navigation'),
  ('nav_about', 'Menu: About', true, 'Show About in navigation')
ON CONFLICT (feature_key) DO NOTHING;