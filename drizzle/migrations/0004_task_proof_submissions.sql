CREATE TABLE public.task_proof_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  proof_url text,
  proof_text text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  auto_approved boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX task_proof_one_open_per_user ON public.task_proof_submissions(task_id, user_id) WHERE status IN ('pending','approved');
CREATE INDEX task_proof_status_idx ON public.task_proof_submissions(status, expires_at);

GRANT SELECT ON public.task_proof_submissions TO authenticated;
GRANT ALL ON public.task_proof_submissions TO service_role;
ALTER TABLE public.task_proof_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own, own-task, or admin proofs" ON public.task_proof_submissions
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.creator_id = auth.uid())
);

-- Internal payout helper
CREATE OR REPLACE FUNCTION public._approve_task_proof(p_id uuid, p_reviewer uuid, p_auto boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub record; v_task record; v_reward integer;
BEGIN
  SELECT * INTO v_sub FROM public.task_proof_submissions WHERE id = p_id FOR UPDATE;
  IF v_sub.id IS NULL OR v_sub.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission already processed');
  END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = v_sub.task_id FOR UPDATE;
  v_reward := COALESCE(v_task.reward_credits, 5);
  UPDATE public.task_proof_submissions SET status='approved', reviewed_by=p_reviewer, reviewed_at=now(), auto_approved=p_auto WHERE id=p_id;
  INSERT INTO public.task_completions (task_id, user_id) VALUES (v_sub.task_id, v_sub.user_id) ON CONFLICT DO NOTHING;
  UPDATE public.tasks SET completions_count = COALESCE(completions_count,0)+1,
    is_active = CASE WHEN max_completions IS NOT NULL AND COALESCE(completions_count,0)+1 >= max_completions THEN false ELSE is_active END
  WHERE id = v_sub.task_id;
  UPDATE public.profiles SET credits = credits + v_reward WHERE user_id = v_sub.user_id;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_sub.user_id, '🎉 Task Proof Approved', 'Your proof for "' || v_task.title || '" was approved' || CASE WHEN p_auto THEN ' automatically after 48 hours' ELSE '' END || '. +' || v_reward || ' credits added.', 'credit');
  RETURN jsonb_build_object('success', true, 'credits_awarded', v_reward);
END; $$;
REVOKE ALL ON FUNCTION public._approve_task_proof(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.auto_approve_expired_task_proofs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.task_proof_submissions WHERE status='pending' AND expires_at <= now() LIMIT 200 LOOP
    PERFORM public._approve_task_proof(r.id, NULL, true); n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
GRANT EXECUTE ON FUNCTION public.auto_approve_expired_task_proofs() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_task_proof(p_task_id uuid, p_proof_url text, p_proof_text text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_task record; v_count integer; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Please sign in'); END IF;
  IF COALESCE(trim(p_proof_url),'') = '' THEN RETURN jsonb_build_object('success', false, 'error', 'A screenshot proof is required'); END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF v_task.id IS NULL OR NOT COALESCE(v_task.is_active, true) THEN RETURN jsonb_build_object('success', false, 'error', 'Task is not available'); END IF;
  IF v_task.creator_id = v_uid THEN RETURN jsonb_build_object('success', false, 'error', 'You cannot complete your own task'); END IF;
  IF EXISTS (SELECT 1 FROM public.task_completions WHERE task_id = p_task_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already completed this task'); END IF;
  SELECT count(*) INTO v_count FROM public.task_proof_submissions WHERE task_id = p_task_id AND status IN ('pending','approved');
  IF v_task.max_completions IS NOT NULL AND v_count >= v_task.max_completions THEN
    RETURN jsonb_build_object('success', false, 'error', 'All spots for this task are taken'); END IF;
  INSERT INTO public.task_proof_submissions (task_id, user_id, proof_url, proof_text)
  VALUES (p_task_id, v_uid, trim(p_proof_url), NULLIF(trim(COALESCE(p_proof_text,'')), '')) RETURNING id INTO v_id;
  IF v_task.creator_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_task.creator_id, '📸 New Task Proof to Review', 'Someone submitted proof for "' || v_task.title || '". Review within 48 hours or it will be approved automatically.', 'info');
  END IF;
  RETURN jsonb_build_object('success', true, 'submission_id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'You already submitted proof for this task');
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_task_proof(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_task_proof(p_submission_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_sub record; v_task record;
BEGIN
  SELECT * INTO v_sub FROM public.task_proof_submissions WHERE id = p_submission_id;
  IF v_sub.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Submission not found'); END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = v_sub.task_id;
  IF v_uid IS NULL OR (v_task.creator_id IS DISTINCT FROM v_uid AND NOT public.has_role(v_uid, 'admin'::app_role)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the task creator or an admin can review this proof'); END IF;
  IF v_sub.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Submission already processed'); END IF;
  IF p_approve THEN RETURN public._approve_task_proof(p_submission_id, v_uid, false); END IF;
  UPDATE public.task_proof_submissions SET status='rejected', rejection_reason=COALESCE(NULLIF(trim(p_reason),''),'Proof not valid'), reviewed_by=v_uid, reviewed_at=now() WHERE id=p_submission_id;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_sub.user_id, '❌ Task Proof Rejected', 'Your proof for "' || v_task.title || '" was rejected: ' || COALESCE(NULLIF(trim(p_reason),''),'Proof not valid') || '. You can submit new proof.', 'warning');
  RETURN jsonb_build_object('success', true, 'status', 'rejected');
END; $$;
GRANT EXECUTE ON FUNCTION public.review_task_proof(uuid, boolean, text) TO authenticated;

-- Instant payout now only for self-verifying YouTube watch tasks
CREATE OR REPLACE FUNCTION public.complete_credit_task(p_task_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_task record;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF v_task.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Task not found'); END IF;
  IF NOT (COALESCE(v_task.task_type,'') ILIKE 'youtube%' OR COALESCE(v_task.share_url,'') ILIKE '%youtube.com%' OR COALESCE(v_task.share_url,'') ILIKE '%youtu.be%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This task requires proof submission', 'requires_proof', true);
  END IF;
  IF NOT COALESCE(v_task.is_active, true) THEN RETURN jsonb_build_object('success', false, 'error', 'Task is no longer active'); END IF;
  IF v_task.creator_id = v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot complete your own task'); END IF;
  IF v_task.max_completions IS NOT NULL AND COALESCE(v_task.completions_count, 0) >= v_task.max_completions THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task has reached maximum completion limit'); END IF;
  IF EXISTS (SELECT 1 FROM public.task_completions WHERE task_id = p_task_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task already completed by you'); END IF;
  INSERT INTO public.task_completions (task_id, user_id) VALUES (p_task_id, v_user_id);
  UPDATE public.tasks SET completions_count = COALESCE(completions_count,0)+1,
    is_active = CASE WHEN max_completions IS NOT NULL AND COALESCE(completions_count,0)+1 >= max_completions THEN false ELSE is_active END
  WHERE id = p_task_id;
  UPDATE public.profiles SET credits = credits + COALESCE(v_task.reward_credits, 5) WHERE user_id = v_user_id;
  RETURN jsonb_build_object('success', true, 'credits_awarded', COALESCE(v_task.reward_credits, 5));
END; $$;