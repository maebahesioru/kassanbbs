--migrate:up
CREATE TABLE banners(
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

--migrate:down
DROP TABLE IF EXISTS banners CASCADE;
