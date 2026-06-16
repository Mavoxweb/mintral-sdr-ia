-- Migration: Initial Database Schema for Antigravity SDR AI
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WHATSAPP INSTANCES (Evolution API sync status)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    numero TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected',
    qr_code TEXT,
    token TEXT,
    api_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for whatsapp_instances
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.whatsapp_instances FOR ALL USING (true) WITH CHECK (true);

-- 2. SDR FLOWS (Outreach & Follow-up Cadences)
CREATE TABLE IF NOT EXISTS public.sdr_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sdr_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.sdr_flows FOR ALL USING (true) WITH CHECK (true);

-- 3. CAMPAIGNS (Commercial Campaigns link flow + WhatsApp instance)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    niche TEXT NOT NULL,
    target_service TEXT NOT NULL,
    tone_of_voice TEXT NOT NULL DEFAULT 'Formal',
    status TEXT NOT NULL DEFAULT 'active',
    flow_id UUID REFERENCES public.sdr_flows(id) ON DELETE SET NULL,
    knowledge_base_id TEXT,
    leads_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    stats JSONB NOT NULL DEFAULT '{"leadsCount": 0, "contactedCount": 0, "responsesCount": 0}'::jsonb,
    city_filter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- 4. LEADS (Enriched business profile and current sales stage)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    rating NUMERIC(3, 2),
    num_ratings INTEGER DEFAULT 0,
    category TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    social_link TEXT,
    section TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Novo Lead',
    rating_label TEXT,
    enrichment JSONB,
    last_message_at TIMESTAMP WITH TIME ZONE,
    takeover_mode TEXT NOT NULL DEFAULT 'bot', -- 'bot' or 'human'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.leads FOR ALL USING (true) WITH CHECK (true);

-- 5. CONVERSATIONS (Live Chat metadata)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    lead_name TEXT NOT NULL,
    lead_phone TEXT NOT NULL,
    instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
    takeover_mode TEXT NOT NULL DEFAULT 'bot', -- Sincronizado com lead.takeover_mode
    last_message_at TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

-- 6. MESSAGES (Chat history)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL, -- 'bot', 'user', 'agent' (human takeover send)
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'read'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write access" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_takeover_mode ON public.leads(takeover_mode);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
