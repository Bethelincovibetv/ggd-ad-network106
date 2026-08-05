DROP TABLE IF EXISTS public.email_campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.email_campaigns CASCADE;
DROP TABLE IF EXISTS public.email_capture_leads CASCADE;
DROP TABLE IF EXISTS public.email_capture_pages CASCADE;
DELETE FROM public.feature_toggles WHERE feature_key IN ('email_campaigns','email_capture_pages','email_preferences','email_custom_upload_list','email_marketing');
DELETE FROM public.app_settings WHERE key IN ('email_campaign_credit_per_recipient','email_sender_name','email_sender_address');