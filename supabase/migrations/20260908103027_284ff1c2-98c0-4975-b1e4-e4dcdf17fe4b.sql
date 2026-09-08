CREATE TABLE IF NOT EXISTS public.syndicate_bank_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_bank_name text,
  old_account_number text,
  old_account_name text,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  bank_code text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.syndicate_bank_change_requests TO authenticated;
GRANT ALL ON public.syndicate_bank_change_requests TO service_role;

ALTER TABLE public.syndicate_bank_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own bank change requests" ON public.syndicate_bank_change_requests;
CREATE POLICY "Members can view own bank change requests"
ON public.syndicate_bank_change_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members can create own bank change requests" ON public.syndicate_bank_change_requests;
CREATE POLICY "Members can create own bank change requests"
ON public.syndicate_bank_change_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage bank change requests" ON public.syndicate_bank_change_requests;
CREATE POLICY "Admins can manage bank change requests"
ON public.syndicate_bank_change_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sbcr_status ON public.syndicate_bank_change_requests (status);
CREATE INDEX IF NOT EXISTS idx_sbcr_user ON public.syndicate_bank_change_requests (user_id);

DROP TRIGGER IF EXISTS trg_sbcr_updated ON public.syndicate_bank_change_requests;
CREATE TRIGGER trg_sbcr_updated
BEFORE UPDATE ON public.syndicate_bank_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();