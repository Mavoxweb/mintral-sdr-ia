-- =============================================================================
-- ⚠️  EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- Projeto: Antigravity SDR AI | DB: zearisdzdqbhljlxixbh.supabase.co
-- Data: 2026-06-16
-- Descrição: Correções críticas de schema identificadas na auditoria técnica
-- =============================================================================
-- Execute cada bloco separadamente se preferir verificar resultado por bloco.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 1: UNIQUE constraint em leads.phone
-- Necessário para: POST /api/leads/import → upsert com onConflict: "phone"
-- Sem isso: erro "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_phone_unique'
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_phone_unique UNIQUE (phone);
    RAISE NOTICE 'leads_phone_unique criado com sucesso.';
  ELSE
    RAISE NOTICE 'leads_phone_unique ja existe, pulando.';
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 2: Tornar conversations.lead_id nullable com FK opcional
-- Necessário para: Webhook da Evolution API cria conversas de números que podem
-- não estar cadastrados como lead ainda (FK violation sem isso)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_lead_id_fkey;

ALTER TABLE public.conversations
  ALTER COLUMN lead_id DROP NOT NULL;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 3: Habilitar Supabase Realtime nas tabelas do live chat
-- Necessário para: ConversationsTab.tsx → supabase.channel("live-chat")
-- Sem isso: eventos INSERT/UPDATE nunca chegam ao frontend
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 4: Índices de performance
-- ─────────────────────────────────────────────────────────────────────────────

-- Índice para ordenar mensagens por timestamp (Realtime e histórico)
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages(created_at ASC);

-- Índice para ordenar conversas pela última mensagem (sidebar)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message
  ON public.conversations(last_message_at DESC);

-- Índice para busca de leads por telefone (upsert + webhook lookup)
CREATE INDEX IF NOT EXISTS idx_leads_phone
  ON public.leads(phone);

-- Índice único para busca de instância por nome (fetch token no addMessage)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_instances_nome
  ON public.whatsapp_instances(nome);


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 5: Colunas adicionais em messages (suporte futuro a mídia)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'image', 'audio', 'video', 'document'


-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCO 6: Coluna instance_name em conversations (denormalização para UI)
-- Evita JOIN com whatsapp_instances para exibir o nome da instância no chat
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS instance_name TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICAÇÕES (rode após aplicar os blocos acima)
-- ─────────────────────────────────────────────────────────────────────────────

-- Verificar constraint UNIQUE em leads.phone:
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.leads'::regclass AND contype = 'u';

-- Verificar se Realtime está ativo:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;

-- Verificar todos os índices das tabelas:
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
