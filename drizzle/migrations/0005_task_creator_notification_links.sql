-- Migration 0005: Direct task management links in creator submission notifications
-- and creator visibility into completions for their own tasks.

-- 1. Allow task creators to view completion rows for tasks they created
--    (e.g., YouTube Watch & Subscribe completions alongside proof submissions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_completions'
      AND policyname = 'Creators can view completions for own tasks'
  ) THEN
    CREATE POLICY "Creators can view completions for own tasks" ON public.task_completions
    FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND t.creator_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;

-- 2. Update submit_task_proof to attach nav_target and link_url pointing directly
--    to the creator's Task Management view for that specific task.
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
    INSERT INTO public.notifications (user_id, title, message, type, nav_target, link_url)
    VALUES (
      v_task.creator_id,
      '📸 New Task Proof to Review',
      'Someone submitted proof for "' || v_task.title || '". Review within 48 hours or it will be approved automatically.',
      'task_proof_submission',
      'task-manage:' || p_task_id::text,
      '/?tab=tasks&manageTask=' || p_task_id::text
    );
  END IF;
  RETURN jsonb_build_object('success', true, 'submission_id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'You already submitted proof for this task');
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_task_proof(uuid, text, text) TO authenticated;
