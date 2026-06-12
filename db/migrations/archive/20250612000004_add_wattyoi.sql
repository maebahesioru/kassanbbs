--migrate:up
ALTER TABLE responses ADD COLUMN IF NOT EXISTS wattyoi TEXT NOT NULL DEFAULT '';

--migrate:down
ALTER TABLE responses DROP COLUMN IF EXISTS wattyoi;
