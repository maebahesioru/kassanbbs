--migrate:up
CREATE TABLE applied_patches(
    patch_name TEXT PRIMARY KEY,
    patch_version TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    result TEXT NOT NULL DEFAULT ''
);

--migrate:down
DROP TABLE IF EXISTS applied_patches CASCADE;
