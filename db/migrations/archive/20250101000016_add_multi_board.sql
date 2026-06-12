--migrate:up
CREATE TABLE boards(
    id UUID PRIMARY KEY,
    board_key TEXT NOT NULL UNIQUE,
    board_name TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    local_rule TEXT NOT NULL DEFAULT '',
    nanashi_name TEXT NOT NULL DEFAULT '名無しさん',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    category TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE threads ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id);

INSERT INTO boards(id, board_key, board_name, local_rule, nanashi_name)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, 'main', 'メイン板', '', '名無しさん'
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE board_key = 'main');

UPDATE threads SET board_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE board_id IS NULL;
UPDATE responses SET board_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE board_id IS NULL;

ALTER TABLE threads ALTER COLUMN board_id SET NOT NULL;
ALTER TABLE responses ALTER COLUMN board_id SET NOT NULL;

CREATE INDEX idx_threads_board_id ON threads(board_id);
CREATE INDEX idx_responses_board_id ON responses(board_id);

--migrate:down
DROP INDEX IF EXISTS idx_responses_board_id;
DROP INDEX IF EXISTS idx_threads_board_id;
ALTER TABLE responses DROP COLUMN IF EXISTS board_id;
ALTER TABLE threads DROP COLUMN IF EXISTS board_id;
DROP TABLE IF EXISTS boards CASCADE;
