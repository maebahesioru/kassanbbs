--migrate:up
CREATE TABLE auth_tokens(
    id UUID PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    ip_address TEXT NOT NULL,
    session_id TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_session ON auth_tokens(session_id);

--migrate:down
DROP TABLE IF EXISTS auth_tokens CASCADE;
