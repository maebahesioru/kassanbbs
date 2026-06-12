--migrate:up
CREATE TABLE samba_tracking(
    id UUID PRIMARY KEY,
    host_identifier TEXT NOT NULL,
    violation_count INTEGER NOT NULL DEFAULT 0,
    current_level TEXT NOT NULL DEFAULT 'none' CHECK (current_level IN ('none', 'caution', 'warning', 'listed', 'banned')),
    last_violation_at TIMESTAMP WITH TIME ZONE,
    ban_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_samba_host ON samba_tracking(host_identifier);

CREATE TABLE samba_config(
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    caution_threshold INTEGER NOT NULL DEFAULT 3,
    warning_threshold INTEGER NOT NULL DEFAULT 6,
    listed_threshold INTEGER NOT NULL DEFAULT 10,
    ban_duration_hours INTEGER NOT NULL DEFAULT 24,
    live_mode_multiplier REAL NOT NULL DEFAULT 0.5,
    violation_decay_hours INTEGER NOT NULL DEFAULT 72
);
INSERT INTO samba_config(id) VALUES (1) ON CONFLICT DO NOTHING;

--migrate:down
DROP TABLE IF EXISTS samba_config CASCADE;
DROP TABLE IF EXISTS samba_tracking CASCADE;
