
ALTER TABLE public.tasks ADD COLUMN creator_id uuid;
ALTER TABLE public.tasks ADD COLUMN funded boolean NOT NULL DEFAULT false;
