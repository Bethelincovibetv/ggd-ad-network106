ALTER TABLE public.syndicate_bank_change_requests RENAME COLUMN bank_name TO requested_bank_name;
ALTER TABLE public.syndicate_bank_change_requests RENAME COLUMN account_number TO requested_account_number;
ALTER TABLE public.syndicate_bank_change_requests RENAME COLUMN account_name TO requested_account_name;
ALTER TABLE public.syndicate_bank_change_requests RENAME COLUMN old_bank_name TO current_bank_name;
ALTER TABLE public.syndicate_bank_change_requests RENAME COLUMN old_account_number TO current_account_number;
ALTER TABLE public.syndicate_bank_change_requests RENAME COLUMN old_account_name TO current_account_name;
ALTER TABLE public.syndicate_bank_change_requests ADD COLUMN IF NOT EXISTS recipient_code text;

ALTER TABLE public.syndicate_profiles ADD COLUMN IF NOT EXISTS is_bank_locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.syndicate_profiles ADD COLUMN IF NOT EXISTS paystack_recipient_code text;

ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS admin_notes text;