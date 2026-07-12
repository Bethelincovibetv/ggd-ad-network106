
INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description)
VALUES ('live_activity', 'Live Activity Feed', true, 'Show the real-time activity feed on the home dashboard')
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.app_settings (key, value)
VALUES ('ad_display_template', 'classic')
ON CONFLICT (key) DO NOTHING;
