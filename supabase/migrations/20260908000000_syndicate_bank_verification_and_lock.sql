-- Migration: Syndicate Bank Verification, Account Lock & Change Workflow
-- Adds bank lock fields to syndicate_profiles and creates syndicate_bank_change_requests

-- 1. Extend syndicate_profiles with bank verification & lock fields
ALTER TABLE public.syndicate_profiles
  ADD COLUMN IF NOT EXISTS is_bank_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS bank_verified_name text;

-- Backfill is_bank_locked for existing profiles with bank accounts
UPDATE public.syndicate_profiles
SET is_bank_locked = true, bank_verified_at = COALESCE(bank_changed_at, created_at, now())
WHERE (account_number IS NOT NULL AND account_number <> '') AND is_bank_locked IS NOT TRUE;

-- 2. Create syndicate_bank_change_requests table
CREATE TABLE IF NOT EXISTS public.syndicate_bank_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_bank_name text,
  current_account_number text,
  current_account_name text,
  requested_bank_name text NOT NULL,
  requested_bank_code text NOT NULL,
  requested_account_number text NOT NULL,
  requested_account_name text NOT NULL,
  paystack_recipient_code text,
  paystack_resolution_details jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.syndicate_bank_change_requests ENABLE ROW LEVEL SECURITY;

-- Policies for syndicate_bank_change_requests
DROP POLICY IF EXISTS "Users can view own bank change requests" ON public.syndicate_bank_change_requests;
CREATE POLICY "Users can view own bank change requests"
  ON public.syndicate_bank_change_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own bank change requests" ON public.syndicate_bank_change_requests;
CREATE POLICY "Users can insert own bank change requests"
  ON public.syndicate_bank_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all bank change requests" ON public.syndicate_bank_change_requests;
CREATE POLICY "Admins can manage all bank change requests"
  ON public.syndicate_bank_change_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_syndicate_bank_change_user ON public.syndicate_bank_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_bank_change_status ON public.syndicate_bank_change_requests(status);
