
-- Add push_token to profiles so send-push-notification edge function can find tokens
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token_updated_at timestamptz;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily quest rotation at midnight UTC every day
-- Calls the rotate-daily-quests edge function via pg_net (also available)
SELECT cron.schedule(
  'rotate-daily-quests',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/rotate-daily-quests',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);


