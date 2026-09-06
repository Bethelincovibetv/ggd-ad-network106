-- Migration: 20260906010000_fix_wallet_transfer_atomicity.sql
-- Fixes credit transfer atomicity:
-- 1. Updates public.transfer_credits to resolve recipient by email, user_id (UUID), referral_code, or business_slug
-- 2. Ensures atomic update: locks both sender & recipient, debits sender, credits recipient, records transfer & notifies
-- 3. Explicitly GRANTS EXECUTE permissions to authenticated and anon roles so PostgREST exposes the function

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
  -- Check if UUID
  IF v_clean_target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT user_id, credits, COALESCE(display_name, business_slug, 'Member')
    INTO v_recipient_id, v_recipient_credits, v_recipient_name
    FROM public.profiles
    WHERE user_id = v_clean_target::uuid
    FOR UPDATE;
  END IF;

  -- If not resolved by UUID, search by email, referral_code, business_slug, or display_name
  IF v_recipient_id IS NULL THEN
    DECLARE
      v_stripped text := lower(replace(v_clean_target, '@', ''));
    BEGIN
      SELECT user_id, credits, COALESCE(display_name, business_slug, 'Member')
      INTO v_recipient_id, v_recipient_credits, v_recipient_name
      FROM public.profiles
      WHERE lower(email) = lower(v_clean_target)
         OR lower(referral_code) = v_stripped
         OR lower(business_slug) = v_stripped
         OR lower(display_name) = lower(v_clean_target)
      LIMIT 1
      FOR UPDATE;
    END;
  END IF;

  IF v_recipient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient user not found');
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
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_recipient_id,
    '💰 Credits Received',
    'You received ' || p_amount || ' GGG credits from transfer.',
    'credit'
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

-- Explicitly grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION public.transfer_credits(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_credits(text, integer) TO anon;

-- Add helper RPC for direct UUID-based transfers
CREATE OR REPLACE FUNCTION public.transfer_credits_to_user(
  p_recipient_user_id uuid,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.transfer_credits(p_recipient_user_id::text, p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_credits_to_user(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_credits_to_user(uuid, integer) TO anon;