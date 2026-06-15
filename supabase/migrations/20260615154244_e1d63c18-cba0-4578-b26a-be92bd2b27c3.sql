
CREATE OR REPLACE FUNCTION public.trigger_activity_email_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fn_url text;
  service_key text;
BEGIN
  -- Best-effort: only fire if pg_net + secrets are available
  BEGIN
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;

  fn_url := current_setting('app.settings.supabase_url', true);
  IF fn_url IS NULL OR fn_url = '' THEN
    -- fallback to env
    fn_url := 'https://sdgxpquruczhkpyhjaxn.supabase.co';
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := fn_url || '/functions/v1/send-activity-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'notification_type', NEW.type,
        'title', NEW.title,
        'message', NEW.message
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- never block notification insert
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_email ON public.notifications;
CREATE TRIGGER trg_notifications_email
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.trigger_activity_email_on_notification();
