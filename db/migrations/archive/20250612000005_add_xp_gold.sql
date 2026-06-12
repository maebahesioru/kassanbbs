--migrate:up
ALTER TABLE ninpocho_records ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ninpocho_records ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ninpocho_records_gold ON ninpocho_records(gold DESC);

ALTER TABLE ninpocho_config ADD COLUMN IF NOT EXISTS max_level INTEGER NOT NULL DEFAULT 100;
ALTER TABLE ninpocho_config ADD COLUMN IF NOT EXISTS xp_per_post INTEGER NOT NULL DEFAULT 3;
ALTER TABLE ninpocho_config ADD COLUMN IF NOT EXISTS xp_per_level INTEGER NOT NULL DEFAULT 10;

--migrate:down
ALTER TABLE ninpocho_records DROP COLUMN IF EXISTS xp;
ALTER TABLE ninpocho_records DROP COLUMN IF EXISTS gold;

DROP INDEX IF EXISTS idx_ninpocho_records_gold;

ALTER TABLE ninpocho_config DROP COLUMN IF EXISTS max_level;
ALTER TABLE ninpocho_config DROP COLUMN IF EXISTS xp_per_post;
ALTER TABLE ninpocho_config DROP COLUMN IF EXISTS xp_per_level;
