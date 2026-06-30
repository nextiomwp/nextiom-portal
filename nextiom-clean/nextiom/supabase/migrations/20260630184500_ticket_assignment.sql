-- ============================================================
-- Ticket Assignment & Transfer Feature Migration
-- Adds assignee to tickets and sender_name to ticket_messages.
-- ============================================================

-- 1. Add assignee column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignee text DEFAULT NULL;

-- 2. Add sender_name column to ticket_messages table
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS sender_name text DEFAULT NULL;
