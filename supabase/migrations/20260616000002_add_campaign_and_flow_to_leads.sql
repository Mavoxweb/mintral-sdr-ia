-- Migration: Add Campaign and Flow relationship to Leads table
-- Target DB: Supabase (zearisdzdqbhljlxixbh.supabase.co)

-- 1. Add columns to public.leads referencing campaigns and flows
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flow_id UUID REFERENCES public.sdr_flows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_step_index INTEGER DEFAULT 0;

-- 2. Create indices for performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id 
  ON public.leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_leads_flow_id 
  ON public.leads(flow_id);
