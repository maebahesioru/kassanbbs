--migrate:up
CREATE TABLE timeline(
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL,
    response_number INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    mail TEXT NOT NULL,
    response_content TEXT NOT NULL,
    hash_id TEXT NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_timeline_thread ON timeline(thread_id, response_number);
CREATE INDEX idx_timeline_posted ON timeline(posted_at DESC);

--migrate:down
DROP TABLE IF EXISTS timeline CASCADE;
