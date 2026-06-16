-- =============================================================================
-- Migration: Schema Fixes & Realtime Enable
-- Ticket: Critical fixes identified in audit 2026-06-15
-- =============================================================================

-- ─── 1. LEADS: Add UNIQUE constraint on phone ────────────────────────────────
-- Required for: POST /api/leads/import uses upsert with onConflict: "phone"
-- Without this, Supabase throws "there is no unique or exclusion constraint matching the ON CONFLICT specification"
ALTER TABLE public.leads
  ADD CONSTRAINT leads_phone_unique UNIQUE (phone);

-- ─── 2. CONVERSATIONS: Relax lead_id FK (allow webhook-created convs without a lead) ─
-- The webhook receives messages from numbers that may not be imported as leads yet.
-- Change: drop FK constraint and make lead_id nullable to prevent FK violations.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_lead_id_fkey;

ALTER TABLE public.conversations
  ALTER COLUMN lead_id DROP NOT NULL;

-- Re-add as optional FK (nullable, cascade on delete if lead exists)
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- ─── 3. MESSAGES: Add created_at index for Realtime ordering ────────────────
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages(created_at ASC);

-- ─── 4. CONVERSATIONS: Add index on last_message_at for sorting ─────────────
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON public.conversations(last_message_at DESC);

-- ─── 5. ENABLE SUPABASE REALTIME on messages & conversations ─────────────────
-- Required for: ConversationsTab.tsx supabase.channel("live-chat") subscription
-- These tables must be in the supabase_realtime publication for INSERT/UPDATE events to fire.
-- NOTE: Run these in the Supabase SQL Editor or via CLI. 
--       They use the replication publication, not standard DDL.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ─── 6. LEADS: Add index on phone for fast upsert lookup ─────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_phone
  ON public.leads(phone);

-- ─── 7. WHATSAPP INSTANCES: Add index on nome for fast token lookup ───────────
-- Required for: addMessage in useStore fetches token by nome (instance name)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_instances_nome
  ON public.whatsapp_instances(nome);

-- ─── 8. MESSAGES: Add media_url column for future media messages ──────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'image', 'audio', 'video', 'document'

-- ─── 9. CONVERSATIONS: Add instance_name for denormalized fast lookup ─────────
-- Avoids JOIN with whatsapp_instances just to display the instance name in the UI
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS instance_name TEXT;

-- ─── Verification queries (run separately to confirm) ─────────────────────────
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'leads'::regclass AND contype = 'u';
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
