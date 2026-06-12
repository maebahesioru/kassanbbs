--migrate:up
ALTER TABLE ip_restrictions ADD COLUMN IF NOT EXISTS host_pattern TEXT;
ALTER TABLE ip_restrictions ADD COLUMN IF NOT EXISTS ua_pattern TEXT;
ALTER TABLE ip_restrictions ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE ip_restrictions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ip_restrictions ADD COLUMN IF NOT EXISTS deny_method TEXT DEFAULT 'host';
ALTER TABLE ip_restrictions ADD COLUMN IF NOT EXISTS ip_range_end TEXT;
ALTER TABLE ip_restrictions ADD COLUMN IF NOT EXISTS ip_version INTEGER DEFAULT 4;
--migrate:down
ALTER TABLE ip_restrictions DROP COLUMN IF EXISTS ip_version;
ALTER TABLE ip_restrictions DROP COLUMN IF EXISTS ip_range_end;
ALTER TABLE ip_restrictions DROP COLUMN IF EXISTS deny_method;
ALTER TABLE ip_restrictions DROP COLUMN IF EXISTS expires_at;
ALTER TABLE ip_restrictions DROP COLUMN IF EXISTS session_id;
ALTER TABLE ip_restrictions DROP COLUMN IF EXISTS ua_pattern;
ALTER TABLE ip_restrictions DROP COLUMN IF EXISTS host_pattern;
