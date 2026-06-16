-- Migration: Enable pg_cron and pg_net for automated SDR queues
-- Enable the extensions (must be run as superuser/postgres in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create an options/config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sdr_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Seed host configuration
INSERT INTO public.sdr_config (key, value)
VALUES ('nextjs_api_url', 'http://localhost:3000/api/cron/process-sdr')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- Create the processing function that will be executed by pg_cron
CREATE OR REPLACE FUNCTION public.trigger_sdr_process()
RETURNS void AS $$
DECLARE
    api_url TEXT;
BEGIN
    -- Retrieve Next.js API processing url
    SELECT value INTO api_url FROM public.sdr_config WHERE key = 'nextjs_api_url';
    
    -- Dispatches asynchronous HTTP POST request to Next.js webhook API route
    PERFORM net.http_post(
        url := api_url,
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every minute
-- (Note: In Supabase, unscheduling is done via: SELECT cron.unschedule('process-sdr-queue');)
SELECT cron.schedule(
    'process-sdr-queue', -- name of the cron job
    '* * * * *',         -- cron expression (every minute)
    'SELECT public.trigger_sdr_process();'
);
