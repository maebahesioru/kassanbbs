--migrate:up
ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE thread_votes(
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL,
    target_response_number INTEGER NOT NULL,
    voter_hash_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(thread_id, target_response_number, voter_hash_id)
);

--migrate:down
DROP TABLE IF EXISTS thread_votes CASCADE;
ALTER TABLE responses DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE responses DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE responses DROP COLUMN IF EXISTS is_deleted;
