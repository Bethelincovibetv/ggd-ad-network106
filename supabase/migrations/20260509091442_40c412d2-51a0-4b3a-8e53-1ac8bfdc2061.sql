-- Assign admin role to bethelgoodgift3@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('6999dfa1-4a32-4d7f-a6c9-eabcd9a6202e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update the trigger function to also auto-assign admin to this email
CREATE OR REPLACE FUNCTION public.handle_admin_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'bethelincovibetv@gmail.com' OR NEW.email = 'bethelgoodgift3@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;