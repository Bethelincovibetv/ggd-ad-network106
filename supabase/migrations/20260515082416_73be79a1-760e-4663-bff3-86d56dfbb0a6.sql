CREATE OR REPLACE FUNCTION public.auto_convert_ad_to_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  toggle text;
  tasks_on boolean;
BEGIN
  SELECT public.is_feature_enabled('tasks') INTO tasks_on;
  IF NOT COALESCE(tasks_on, true) THEN
    RETURN NEW;
  END IF;

  SELECT value INTO toggle FROM public.app_settings WHERE key = 'auto_convert_ads_to_tasks';
  IF toggle = 'true' AND NEW.is_active = true THEN
    INSERT INTO public.tasks (title, description, share_url, task_type, reward_credits, max_completions, creator_id, funded, flyer_url)
    VALUES (
      'Share: ' || NEW.title,
      COALESCE(NEW.description, 'Share this ad and earn credits!'),
      NEW.target_url,
      'share',
      5,
      20,
      NEW.user_id,
      true,
      NEW.image_url
    );
  END IF;
  RETURN NEW;
END;
$function$;