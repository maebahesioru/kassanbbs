--migrate:up
CREATE TABLE host_logs(
    id UUID PRIMARY KEY,
    host TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    hash_id TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_host_logs_ip ON host_logs(ip_address);
CREATE INDEX idx_host_logs_host ON host_logs(host);
CREATE INDEX idx_host_logs_created ON host_logs(created_at DESC);

--migrate:down
DROP TABLE IF EXISTS host_logs CASCADE;
