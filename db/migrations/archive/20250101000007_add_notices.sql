--migrate:up
CREATE TABLE notices(
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'host', 'ip', 'hash_id')),
    target_value TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

--migrate:down
DROP TABLE IF EXISTS notices CASCADE;
