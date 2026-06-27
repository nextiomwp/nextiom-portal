-- Add start_date and end_date columns to notifications table for date-bound announcements
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
