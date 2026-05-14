INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description)
VALUES
  ('setup_wizard', 'Setup Wizard', true, 'Show the platform onboarding wizard with feature highlights and action buttons'),
  ('syndicate_onboarding_wizard', 'Syndicate Onboarding Wizard', true, 'Show approved syndicates a guided walkthrough including bank details setup')
ON CONFLICT (feature_key) DO NOTHING;