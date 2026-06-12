--migrate:up
ALTER TABLE config ADD COLUMN IF NOT EXISTS last_update_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE config ADD COLUMN IF NOT EXISTS update_available TEXT;
--migrate:down
ALTER TABLE config DROP COLUMN IF EXISTS update_available;
ALTER TABLE config DROP COLUMN IF EXISTS last_update_check;
