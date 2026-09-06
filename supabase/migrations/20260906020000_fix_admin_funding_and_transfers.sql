-- Migration: 20260906020000_fix_admin_funding_and_transfers.sql
-- Fixes:
-- 1. transfer_credits RPC recipient resolution by UUID (checking both user_id and profiles.id), email, referral_code, business_slug, and display_name
-- 2. Admin direct funding RPC for Task Wallet (Naira balance): admin_fund_task_wallet
-- 3. Admin direct credit adjustment RPC: admin_adjust_user_credits
-- 4. Ensures RLS policies on task_wallets allow Admin full access

-- 1. UPDATE transfer_credits RPC
CREATE OR REPLACE FUNCTION public.transfer_credits(
  p_recipient_email text,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_recipient_id uuid := NULL;
  v_recipient_name text := 'Member';
  v_sender_credits integer;
  v_sender_bonus integer;
  v_recipient_credits integer;
  v_clean_target text;
  v_transfer_id uuid;
BEGIN
  -- 1. Authorization check
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: you must be signed in to transfer credits');
  END IF;

  -- 2. Amount validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer amount must be greater than zero');
  END IF;

  IF p_recipient_email IS NULL OR trim(p_recipient_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient identifier is required');
  END IF;

  v_clean_target := trim(p_recipient_email);

  -- 3. Lock and verify sender balance
  SELECT credits, COALESCE(login_bonus_credits, 0)
  INTO v_sender_credits, v_sender_bonus
  FROM public.profiles
  WHERE user_id = v_sender_id
  FOR UPDATE;

  IF v_sender_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender wallet profile not found');
  END IF;

  IF (v_sender_credits - v_sender_bonus) < p_amount THEN
    IF v_sender_bonus > 0 AND v_sender_credits >= p_amount THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Insufficient transferable credits. ' || v_sender_bonus || ' credits are promotional login bonus and cannot be transferred.'
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits. You have ' || v_sender_credits || ' credits available.');
  END IF;

  -- 4. Resolve recipient
  -- Check if UUID (check BOTH user_id and profiles.id)
  IF v_clean_target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT user_id, credits, COALESCE(display_name, business_slug, 'Member')
    INTO v_recipient_id, v_recipient_credits, v_recipient_name
    FROM public.profiles
    WHERE user_id = v_clean_target::uuid OR id = v_clean_target::uuid
    LIMIT 1
    FOR UPDATE;
  END IF;

  -- If not resolved by UUID, search by email, referral_code, business_slug, or display_name
  IF v_recipient_id IS NULL THEN
    DECLARE
      v_stripped text := lower(replace(replace(v_clean_target, '@', ''), ' ', ''));
    BEGIN
      SELECT user_id, credits, COALESCE(display_name, business_slug, 'Member')
      INTO v_recipient_id, v_recipient_credits, v_recipient_name
      FROM public.profiles
      WHERE lower(trim(email)) = lower(v_clean_target)
         OR lower(trim(referral_code)) = v_stripped
         OR lower(trim(business_slug)) = v_stripped
         OR lower(trim(display_name)) = lower(v_clean_target)
         OR lower(trim(display_name)) = v_stripped
      LIMIT 1
      FOR UPDATE;
    END;
  END IF;

  IF v_recipient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient user not found. Please verify the email, username, or referral code.');
  END IF;

  IF v_recipient_id = v_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer credits to your own account');
  END IF;

  -- 5. ATOMIC TRANSFER: Debit sender, credit recipient, record transfer, and notify
  UPDATE public.profiles
  SET credits = credits - p_amount
  WHERE user_id = v_sender_id;

  UPDATE public.profiles
  SET credits = credits + p_amount
  WHERE user_id = v_recipient_id;

  -- Insert transfer ledger record
  INSERT INTO public.credit_transfers (sender_id, receiver_id, amount)
  VALUES (v_sender_id, v_recipient_id, p_amount)
  RETURNING id INTO v_transfer_id;

  -- Notify recipient
  INSERT INTO public.notifications (user_id, title, message, type, is_read)
  VALUES (
    v_recipient_id,
    '💰 Credits Received',
    'You received ' || p_amount || ' GGG credits from transfer.',
    'credit',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'amount', p_amount,
    'new_balance', v_sender_credits - p_amount,
    'recipient_id', v_recipient_id,
    'recipient_name', v_recipient_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_credits(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_credits(text, integer) TO anon;

-- 2. ADMIN RPC: Adjust User Credits
CREATE OR REPLACE FUNCTION public.admin_adjust_user_credits(
  p_target_id text,
  p_amount integer,
  p_reason text DEFAULT 'Admin manual adjustment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_target_user_id uuid := NULL;
  v_current_credits integer := 0;
  v_new_credits integer := 0;
  v_target_name text := 'User';
BEGIN
  -- Admin authorization check
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment amount cannot be zero');
  END IF;

  -- Resolve target user by UUID (user_id or profile id) or email
  IF p_target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT user_id, credits, COALESCE(display_name, email, 'User')
    INTO v_target_user_id, v_current_credits, v_target_name
    FROM public.profiles
    WHERE user_id = p_target_id::uuid OR id = p_target_id::uuid
    LIMIT 1
    FOR UPDATE;
  ELSE
    SELECT user_id, credits, COALESCE(display_name, email, 'User')
    INTO v_target_user_id, v_current_credits, v_target_name
    FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(p_target_id))
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user profile not found');
  END IF;

  v_new_credits := GREATEST(0, v_current_credits + p_amount);

  UPDATE public.profiles
  SET credits = v_new_credits
  WHERE user_id = v_target_user_id;

  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, is_read)
  VALUES (
    v_target_user_id,
    CASE WHEN p_amount > 0 THEN '🎉 Credits Added by Admin' ELSE '⚠️ Credits Debited by Admin' END,
    CASE WHEN p_amount > 0 
      THEN 'Admin added ' || p_amount || ' GGG credits to your wallet (' || COALESCE(p_reason, 'Admin adjustment') || '). New balance: ' || v_new_credits || ' credits.'
      ELSE 'Admin debited ' || abs(p_amount) || ' GGG credits from your wallet (' || COALESCE(p_reason, 'Admin adjustment') || '). New balance: ' || v_new_credits || ' credits.'
    END,
    'credit',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', v_target_user_id,
    'amount', p_amount,
    'previous_credits', v_current_credits,
    'new_credits', v_new_credits
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_user_credits(text, integer, text) TO authenticated;

-- 3. ADMIN RPC: Fund or Debit Naira Task Wallet
CREATE OR REPLACE FUNCTION public.admin_fund_task_wallet(
  p_target_id text,
  p_amount numeric,
  p_reason text DEFAULT 'Admin wallet funding'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_target_user_id uuid := NULL;
  v_current_balance numeric := 0;
  v_current_funded numeric := 0;
  v_new_balance numeric := 0;
  v_new_funded numeric := 0;
  v_target_name text := 'User';
BEGIN
  -- Admin authorization check
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Funding amount cannot be zero');
  END IF;

  -- Resolve target user by UUID or email
  IF p_target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT user_id, COALESCE(display_name, email, 'User')
    INTO v_target_user_id, v_target_name
    FROM public.profiles
    WHERE user_id = p_target_id::uuid OR id = p_target_id::uuid
    LIMIT 1;
  ELSE
    SELECT user_id, COALESCE(display_name, email, 'User')
    INTO v_target_user_id, v_target_name
    FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(p_target_id))
    LIMIT 1;
  END IF;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user profile not found');
  END IF;

  -- Ensure task_wallets row exists
  INSERT INTO public.task_wallets (user_id, balance, total_funded)
  VALUES (v_target_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and read current wallet
  SELECT balance, total_funded
  INTO v_current_balance, v_current_funded
  FROM public.task_wallets
  WHERE user_id = v_target_user_id
  FOR UPDATE;

  v_current_balance := COALESCE(v_current_balance, 0);
  v_current_funded := COALESCE(v_current_funded, 0);

  v_new_balance := GREATEST(0, v_current_balance + p_amount);
  IF p_amount > 0 THEN
    v_new_funded := v_current_funded + p_amount;
  ELSE
    v_new_funded := v_current_funded;
  END IF;

  UPDATE public.task_wallets
  SET balance = v_new_balance,
      total_funded = v_new_funded
  WHERE user_id = v_target_user_id;

  -- Insert notification for the user
  INSERT INTO public.notifications (user_id, title, message, type, is_read)
  VALUES (
    v_target_user_id,
    CASE WHEN p_amount > 0 THEN '💼 Task Wallet Funded!' ELSE '💼 Task Wallet Debited' END,
    CASE WHEN p_amount > 0 
      THEN 'Admin funded your Naira Task Wallet with ₦' || p_amount || ' (' || COALESCE(p_reason, 'Manual top-up') || '). New balance: ₦' || v_new_balance || '.'
      ELSE 'Admin debited ₦' || abs(p_amount) || ' from your Naira Task Wallet (' || COALESCE(p_reason, 'Adjustment') || '). New balance: ₦' || v_new_balance || '.'
    END,
    'wallet',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', v_target_user_id,
    'amount', p_amount,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_fund_task_wallet(text, numeric, text) TO authenticated;

-- 4. HARDEN TASK WALLETS RLS: Ensure admin has full management access
DROP POLICY IF EXISTS "Admin can manage wallets" ON public.task_wallets;
DROP POLICY IF EXISTS "Admin can manage all task wallets" ON public.task_wallets;
CREATE POLICY "Admin can manage all task wallets" ON public.task_wallets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
