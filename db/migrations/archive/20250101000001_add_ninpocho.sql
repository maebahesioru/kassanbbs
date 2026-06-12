--migrate:up
CREATE TABLE ninpocho_records(
    id UUID PRIMARY KEY,
    hash_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    ban_level INTEGER NOT NULL DEFAULT 0,
    ban_until TIMESTAMP WITH TIME ZONE,
    last_error_at TIMESTAMP WITH TIME ZONE,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ninpocho_hash_id ON ninpocho_records(hash_id);
CREATE INDEX idx_ninpocho_ip ON ninpocho_records(ip_address);
CREATE INDEX idx_ninpocho_ban_until ON ninpocho_records(ban_until);

CREATE TABLE ninpocho_config(
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    error_threshold_1 INTEGER NOT NULL DEFAULT 3,
    ban_duration_1_hours INTEGER NOT NULL DEFAULT 1,
    error_threshold_2 INTEGER NOT NULL DEFAULT 5,
    ban_duration_2_hours INTEGER NOT NULL DEFAULT 24,
    error_threshold_3 INTEGER NOT NULL DEFAULT 10,
    ban_duration_3_hours INTEGER NOT NULL DEFAULT 168,
    permanent_ban_threshold INTEGER NOT NULL DEFAULT 20,
    error_decay_hours INTEGER NOT NULL DEFAULT 72
);
INSERT INTO ninpocho_config(id) VALUES (1) ON CONFLICT DO NOTHING;

--migrate:down
DROP TABLE IF EXISTS ninpocho_records CASCADE;
DROP TABLE IF EXISTS ninpocho_config CASCADE;
