
INSERT INTO public.feature_toggles (feature_key, feature_name, description, is_enabled)
VALUES ('business_sites', 'Public Business Sites', 'Allow every user to have an auto-generated public business site (/user/:id). Disable to hide all public sites.', true)
ON CONFLICT DO NOTHING;

ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS hero_image_url text;
