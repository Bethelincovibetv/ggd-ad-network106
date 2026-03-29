ALTER TABLE public.task_wallets ADD COLUMN IF NOT EXISTS total_funded numeric DEFAULT 0;
ALTER TABLE public.task_wallets ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0;