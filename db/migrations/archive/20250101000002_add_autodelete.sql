--migrate:up
ALTER TABLE threads ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE auto_delete_config(
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    delete_after_days INTEGER NOT NULL DEFAULT 30,
    only_if_stopped BOOLEAN NOT NULL DEFAULT TRUE,
    only_if_no_responses_days INTEGER NOT NULL DEFAULT 0,
    deleted_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO auto_delete_config(id) VALUES (1) ON CONFLICT DO NOTHING;

--migrate:down
DROP TABLE IF EXISTS auto_delete_config CASCADE;
ALTER TABLE threads DROP COLUMN IF EXISTS auto_delete_at;
