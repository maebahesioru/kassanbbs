--migrate:up
CREATE TABLE write_logs(
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL,
    response_number INTEGER NOT NULL,
    hash_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    mail TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_write_logs_thread ON write_logs(thread_id, response_number);

--migrate:down
DROP TABLE IF EXISTS write_logs CASCADE;
