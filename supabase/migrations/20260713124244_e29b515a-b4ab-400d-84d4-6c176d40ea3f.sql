INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description) VALUES
  ('referral_system', 'Referral System', true, 'Enables referral codes, referral share buttons, and promotional referral copies. When off, only plain sharing remains.'),
  ('email_preferences', 'Email Preferences', true, 'Shows the Email Preferences page in the user menu.'),
  ('quick_guide', 'Quick Guide', true, 'Shows the Guide entry in the user menu.')
ON CONFLICT (feature_key) DO NOTHING;