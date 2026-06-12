--migrate:up
ALTER TABLE ninpocho_records ADD COLUMN IF NOT EXISTS total_posts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ninpocho_records ADD COLUMN IF NOT EXISTS profile_password_hash TEXT;
ALTER TABLE ninpocho_records ADD COLUMN IF NOT EXISTS saved_profile_data TEXT;

ALTER TABLE ninpocho_config ADD COLUMN IF NOT EXISTS force_sage_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ninpocho_config ADD COLUMN IF NOT EXISTS force_kote_name TEXT NOT NULL DEFAULT '';

--migrate:down
ALTER TABLE ninpocho_records DROP COLUMN IF EXISTS total_posts;
ALTER TABLE ninpocho_records DROP COLUMN IF EXISTS profile_password_hash;
ALTER TABLE ninpocho_records DROP COLUMN IF EXISTS saved_profile_data;

ALTER TABLE ninpocho_config DROP COLUMN IF EXISTS force_sage_level;
ALTER TABLE ninpocho_config DROP COLUMN IF EXISTS force_kote_name;
