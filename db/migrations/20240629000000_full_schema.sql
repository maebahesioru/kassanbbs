--migrate:up

-- ############################################################
-- BOARDS
-- ############################################################
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

-- ############################################################
-- THREADS
-- ############################################################
CREATE TABLE threads(
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    epoch_id BIGINT NOT NULL UNIQUE,
    is_stopped BOOLEAN NOT NULL DEFAULT FALSE,
    is_pooled BOOLEAN NOT NULL DEFAULT FALSE,
    max_responses INTEGER NOT NULL DEFAULT 1000,
    auto_delete_at TIMESTAMP WITH TIME ZONE,
    attrs JSONB NOT NULL DEFAULT '{}',
    board_id UUID NOT NULL REFERENCES boards(id)
);

-- ############################################################
-- RESPONSES
-- ############################################################
CREATE TABLE responses(
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL,
    response_number INT NOT NULL,
    author_name TEXT NOT NULL,
    mail TEXT NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    response_content TEXT NOT NULL,
    hash_id TEXT NOT NULL,
    trip TEXT,
    content_hash TEXT DEFAULT '',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_by TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    board_id UUID NOT NULL REFERENCES boards(id),
    be_id TEXT,
    wattyoi TEXT NOT NULL DEFAULT '',
    UNIQUE(thread_id, response_number)
);

-- ############################################################
-- CONFIG
-- ############################################################
CREATE TABLE config(
    board_name TEXT PRIMARY KEY,
    local_rule TEXT NOT NULL,
    nanashi_name TEXT NOT NULL,
    max_content_length INT NOT NULL,
    admin_password TEXT NOT NULL,
    enable_spam_detection BOOLEAN NOT NULL DEFAULT TRUE,
    spam_threshold INTEGER NOT NULL DEFAULT 3,
    captcha_provider TEXT NOT NULL DEFAULT 'none',
    captcha_site_key TEXT NOT NULL DEFAULT '',
    captcha_secret_key TEXT NOT NULL DEFAULT '',
    enable_dnsbl BOOLEAN NOT NULL DEFAULT FALSE,
    dnsbl_hostnames TEXT NOT NULL DEFAULT '',
    enable_vpn_detection BOOLEAN NOT NULL DEFAULT FALSE,
    referrer_cushion TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    favicon_url TEXT NOT NULL DEFAULT '',
    board_image_url TEXT NOT NULL DEFAULT '',
    board_image_link_url TEXT NOT NULL DEFAULT '',
    bg_color TEXT NOT NULL DEFAULT '#f3f4f6',
    text_color TEXT NOT NULL DEFAULT '#1f2937',
    link_color TEXT NOT NULL DEFAULT '#7c3aed',
    name_color TEXT NOT NULL DEFAULT '#374151',
    enable_twitter_widgets BOOLEAN NOT NULL DEFAULT FALSE,
    bg_color2 TEXT NOT NULL DEFAULT '#ffffff',
    title_color TEXT NOT NULL DEFAULT '#000000',
    cap_color TEXT NOT NULL DEFAULT '#ff0000',
    post_bg_color TEXT NOT NULL DEFAULT '#ffffff',
    anchor_color TEXT NOT NULL DEFAULT '#0000ff',
    index_bg_color TEXT NOT NULL DEFAULT '#ffffff',
    create_bg_color TEXT NOT NULL DEFAULT '#ffffff',
    menu_bg_color TEXT NOT NULL DEFAULT '#ffffff',
    menu_text_color TEXT NOT NULL DEFAULT '#000000',
    title_id BOOLEAN NOT NULL DEFAULT TRUE,
    msec_display BOOLEAN NOT NULL DEFAULT FALSE,
    hide_hits BOOLEAN NOT NULL DEFAULT FALSE,
    pr_text TEXT NOT NULL DEFAULT '',
    pr_link TEXT NOT NULL DEFAULT '',
    max_name_length INTEGER NOT NULL DEFAULT 20,
    max_mail_length INTEGER NOT NULL DEFAULT 50,
    max_subject_length INTEGER NOT NULL DEFAULT 100,
    line_max_chars INTEGER NOT NULL DEFAULT 80,
    submax INTEGER NOT NULL DEFAULT 1000,
    datmax INTEGER NOT NULL DEFAULT 1000,
    nanashi_check BOOLEAN NOT NULL DEFAULT TRUE,
    samba_time INTEGER NOT NULL DEFAULT 30,
    houshi_time INTEGER NOT NULL DEFAULT 60,
    tatesugi_hour INTEGER NOT NULL DEFAULT 24,
    tatesugi_count INTEGER NOT NULL DEFAULT 5,
    tatesugi_close INTEGER NOT NULL DEFAULT 48,
    tatesugi_close_count INTEGER NOT NULL DEFAULT 3,
    slip_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    slip_default_level TEXT NOT NULL DEFAULT 'vvv',
    disp_ip BOOLEAN NOT NULL DEFAULT FALSE,
    be_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    vote_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    omikuji_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    tasukeruyo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    hide_op BOOLEAN NOT NULL DEFAULT FALSE,
    img_tag BOOLEAN NOT NULL DEFAULT FALSE,
    twitter_embed BOOLEAN NOT NULL DEFAULT FALSE,
    movie_embed BOOLEAN NOT NULL DEFAULT FALSE,
    url_to_title BOOLEAN NOT NULL DEFAULT FALSE,
    auto_fall BOOLEAN NOT NULL DEFAULT FALSE,
    captcha_per_board TEXT NOT NULL DEFAULT 'none',
    usecaptcha_on_admin BOOLEAN NOT NULL DEFAULT FALSE,
    high_light BOOLEAN NOT NULL DEFAULT TRUE,
    weekday_chars TEXT NOT NULL DEFAULT '日月火水木金土',
    trip_column INTEGER NOT NULL DEFAULT 0,
    last_update_check TIMESTAMP WITH TIME ZONE,
    update_available TEXT,
    max_lines INTEGER NOT NULL DEFAULT 30,
    max_line_width INTEGER NOT NULL DEFAULT 80,
    max_anchors INTEGER NOT NULL DEFAULT 10
);

-- ############################################################
-- NG WORDS
-- ############################################################
CREATE TABLE ng_words(
    id UUID PRIMARY KEY,
    word TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- ADMIN LOGS
-- ############################################################
CREATE TABLE admin_logs(
    id UUID PRIMARY KEY,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    log_type TEXT NOT NULL DEFAULT 'ADMIN',
    version TEXT NOT NULL DEFAULT ''
);

-- ############################################################
-- IP RESTRICTIONS
-- ############################################################
CREATE TABLE ip_restrictions(
    id UUID PRIMARY KEY,
    ip_or_cidr TEXT NOT NULL,
    restriction_type TEXT NOT NULL CHECK (restriction_type IN ('deny', 'allow')),
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    host_pattern TEXT,
    ua_pattern TEXT,
    session_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    deny_method TEXT DEFAULT 'host',
    ip_range_end TEXT,
    ip_version INTEGER DEFAULT 4
);

-- ############################################################
-- ADMIN USERS
-- ############################################################
CREATE TABLE admin_users(
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- ADMIN GROUPS
-- ############################################################
CREATE TABLE admin_groups(
    id UUID PRIMARY KEY,
    group_name TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- ADMIN USER GROUPS
-- ############################################################
CREATE TABLE admin_user_groups(
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES admin_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- ############################################################
-- PLUGIN REGISTRY
-- ############################################################
CREATE TABLE plugin_registry(
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    hook_type INTEGER NOT NULL DEFAULT 0,
    config_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- NINPOCHO RECORDS
-- ############################################################
CREATE TABLE ninpocho_records(
    id UUID PRIMARY KEY,
    hash_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    ban_level INTEGER NOT NULL DEFAULT 0,
    ban_until TIMESTAMP WITH TIME ZONE,
    last_error_at TIMESTAMP WITH TIME ZONE,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_posts INTEGER NOT NULL DEFAULT 0,
    profile_password_hash TEXT,
    saved_profile_data TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    gold INTEGER NOT NULL DEFAULT 0
);

-- ############################################################
-- NINPOCHO CONFIG
-- ############################################################
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
    error_decay_hours INTEGER NOT NULL DEFAULT 72,
    force_sage_level INTEGER NOT NULL DEFAULT 0,
    force_kote_name TEXT NOT NULL DEFAULT '',
    max_level INTEGER NOT NULL DEFAULT 100,
    xp_per_post INTEGER NOT NULL DEFAULT 3,
    xp_per_level INTEGER NOT NULL DEFAULT 10
);

-- ############################################################
-- AUTO DELETE CONFIG
-- ############################################################
CREATE TABLE auto_delete_config(
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    delete_after_days INTEGER NOT NULL DEFAULT 30,
    only_if_stopped BOOLEAN NOT NULL DEFAULT TRUE,
    only_if_no_responses_days INTEGER NOT NULL DEFAULT 0,
    deleted_count INTEGER NOT NULL DEFAULT 0
);

-- ############################################################
-- BANNERS
-- ############################################################
CREATE TABLE banners(
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- THREAD VOTES
-- ############################################################
CREATE TABLE thread_votes(
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL,
    target_response_number INTEGER NOT NULL,
    voter_hash_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(thread_id, target_response_number, voter_hash_id)
);

-- ############################################################
-- NOTICES
-- ############################################################
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

-- ############################################################
-- SAMBA TRACKING
-- ############################################################
CREATE TABLE samba_tracking(
    id UUID PRIMARY KEY,
    host_identifier TEXT NOT NULL,
    violation_count INTEGER NOT NULL DEFAULT 0,
    current_level TEXT NOT NULL DEFAULT 'none' CHECK (current_level IN ('none', 'caution', 'warning', 'listed', 'banned')),
    last_violation_at TIMESTAMP WITH TIME ZONE,
    ban_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- SAMBA CONFIG
-- ############################################################
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

-- ############################################################
-- AUTH TOKENS
-- ############################################################
CREATE TABLE auth_tokens(
    id UUID PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    ip_address TEXT NOT NULL,
    session_id TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- TIMELINE
-- ############################################################
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

-- ############################################################
-- APPLIED PATCHES
-- ############################################################
CREATE TABLE applied_patches(
    patch_name TEXT PRIMARY KEY,
    patch_version TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    result TEXT NOT NULL DEFAULT ''
);

-- ############################################################
-- HOST LOGS
-- ############################################################
CREATE TABLE host_logs(
    id UUID PRIMARY KEY,
    host TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    hash_id TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ############################################################
-- WRITE LOGS
-- ############################################################
CREATE TABLE write_logs(
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL,
    response_number INTEGER NOT NULL,
    hash_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    mail TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version TEXT NOT NULL DEFAULT ''
);

-- ############################################################
-- INDEXES
-- ############################################################

-- threads
CREATE INDEX idx_threads_epoch_id ON threads(epoch_id);
CREATE INDEX idx_threads_updated_at ON threads(updated_at DESC);
CREATE INDEX idx_threads_attrs ON threads USING GIN(attrs);
CREATE INDEX idx_threads_board_id ON threads(board_id);
CREATE INDEX idx_threads_auto_delete ON threads(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- responses
CREATE INDEX idx_responses_thread_id ON responses(thread_id);
CREATE INDEX idx_responses_thread_id_response_number ON responses(thread_id, response_number);
CREATE INDEX idx_responses_board_id ON responses(board_id);
CREATE INDEX idx_responses_hash_id ON responses(hash_id);

-- ng_words
CREATE INDEX idx_ng_words_word ON ng_words(word);

-- admin_logs
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- ip_restrictions
CREATE INDEX idx_ip_restrictions_type ON ip_restrictions(restriction_type);
CREATE INDEX idx_ip_restrictions_ip ON ip_restrictions(ip_or_cidr);

-- admin_users
CREATE INDEX idx_admin_users_username ON admin_users(username);

-- plugin_registry
CREATE INDEX idx_plugin_registry_hook ON plugin_registry(hook_type) WHERE is_active = TRUE;

-- ninpocho_records
CREATE INDEX idx_ninpocho_hash_id ON ninpocho_records(hash_id);
CREATE INDEX idx_ninpocho_ip ON ninpocho_records(ip_address);
CREATE INDEX idx_ninpocho_ban_until ON ninpocho_records(ban_until);
CREATE INDEX idx_ninpocho_records_gold ON ninpocho_records(gold DESC);

-- samba_tracking
CREATE UNIQUE INDEX idx_samba_host ON samba_tracking(host_identifier);

-- auth_tokens
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_session ON auth_tokens(session_id);

-- timeline
CREATE INDEX idx_timeline_thread ON timeline(thread_id, response_number);
CREATE INDEX idx_timeline_posted ON timeline(posted_at DESC);

-- thread_votes
CREATE INDEX idx_thread_votes_thread_id ON thread_votes(thread_id);

-- notices
CREATE INDEX idx_notices_active ON notices(is_active, target_type) WHERE is_active = TRUE;

-- banners
CREATE INDEX idx_banners_position ON banners(position) WHERE is_active = TRUE;

-- host_logs
CREATE INDEX idx_host_logs_ip ON host_logs(ip_address);
CREATE INDEX idx_host_logs_host ON host_logs(host);
CREATE INDEX idx_host_logs_created ON host_logs(created_at DESC);

-- write_logs
CREATE INDEX idx_write_logs_thread ON write_logs(thread_id, response_number);

-- ############################################################
-- SEED DATA
-- ############################################################

INSERT INTO threads(
    id,
    title,
    posted_at,
    updated_at,
    epoch_id
)
VALUES(
    '01953082-1ea4-7a71-8ac2-395cedbd9ecb',
    'ようこそ！',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00',
    1735657200
);

INSERT INTO responses(
    id,
    thread_id,
    response_number,
    author_name,
    mail,
    posted_at,
    response_content,
    hash_id,
    trip
)
VALUES(
    '01953082-8ae5-7df7-8446-e02b6b9189e7',
    '01953082-1ea4-7a71-8ac2-395cedbd9ecb',
    1,
    'KassanBBS',
    'dummy@example.com',
    '2025-01-01 00:00:00',
    'KassanBBS Boardへようこそ！',
    'welcome.',
    'UNhY4JhezH9g'
);

INSERT INTO config(
    board_name,
    local_rule,
    nanashi_name,
    max_content_length,
    admin_password
)
VALUES(
    'KassanBBS Board',
    'ローカルルールはここに記述',
    '名無しさん',
    1000,
    '$2b$10$9gxLQMYSDoBdbz/1znmieu1vjhZ2VGzKd21azF112uG45DvQNn0E6'
);

INSERT INTO admin_users(id, username, password_hash, full_name, is_super_admin)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin',
    admin_password,
    'Administrator',
    TRUE
FROM config
LIMIT 1;

INSERT INTO ninpocho_config(id) VALUES (1) ON CONFLICT DO NOTHING;

INSERT INTO auto_delete_config(id) VALUES (1) ON CONFLICT DO NOTHING;

INSERT INTO samba_config(id) VALUES (1) ON CONFLICT DO NOTHING;

INSERT INTO boards(id, board_key, board_name, local_rule, nanashi_name)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, 'main', 'メイン板', '', '名無しさん'
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE board_key = 'main');

UPDATE threads SET board_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE board_id IS NULL;
UPDATE responses SET board_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE board_id IS NULL;

DELETE FROM auth_tokens WHERE expires_at < NOW() - INTERVAL '7 days';

--migrate:down

DROP INDEX IF EXISTS idx_write_logs_thread;
DROP INDEX IF EXISTS idx_host_logs_created;
DROP INDEX IF EXISTS idx_host_logs_host;
DROP INDEX IF EXISTS idx_host_logs_ip;
DROP INDEX IF EXISTS idx_banners_position;
DROP INDEX IF EXISTS idx_notices_active;
DROP INDEX IF EXISTS idx_thread_votes_thread_id;
DROP INDEX IF EXISTS idx_timeline_posted;
DROP INDEX IF EXISTS idx_timeline_thread;
DROP INDEX IF EXISTS idx_auth_tokens_session;
DROP INDEX IF EXISTS idx_auth_tokens_token;
DROP INDEX IF EXISTS idx_ninpocho_records_gold;
DROP INDEX IF EXISTS idx_samba_host;
DROP INDEX IF EXISTS idx_ninpocho_ban_until;
DROP INDEX IF EXISTS idx_ninpocho_ip;
DROP INDEX IF EXISTS idx_ninpocho_hash_id;
DROP INDEX IF EXISTS idx_plugin_registry_hook;
DROP INDEX IF EXISTS idx_admin_users_username;
DROP INDEX IF EXISTS idx_ip_restrictions_ip;
DROP INDEX IF EXISTS idx_ip_restrictions_type;
DROP INDEX IF EXISTS idx_admin_logs_created_at;
DROP INDEX IF EXISTS idx_ng_words_word;
DROP INDEX IF EXISTS idx_responses_hash_id;
DROP INDEX IF EXISTS idx_responses_board_id;
DROP INDEX IF EXISTS idx_responses_thread_id_response_number;
DROP INDEX IF EXISTS idx_responses_thread_id;
DROP INDEX IF EXISTS idx_threads_auto_delete;
DROP INDEX IF EXISTS idx_threads_board_id;
DROP INDEX IF EXISTS idx_threads_attrs;
DROP INDEX IF EXISTS idx_threads_updated_at;
DROP INDEX IF EXISTS idx_threads_epoch_id;

DROP TABLE IF EXISTS applied_patches CASCADE;
DROP TABLE IF EXISTS timeline CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS samba_config CASCADE;
DROP TABLE IF EXISTS samba_tracking CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS thread_votes CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS auto_delete_config CASCADE;
DROP TABLE IF EXISTS ninpocho_config CASCADE;
DROP TABLE IF EXISTS ninpocho_records CASCADE;
DROP TABLE IF EXISTS plugin_registry CASCADE;
DROP TABLE IF EXISTS admin_user_groups CASCADE;
DROP TABLE IF EXISTS admin_groups CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS ip_restrictions CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS ng_words CASCADE;
DROP TABLE IF EXISTS host_logs CASCADE;
DROP TABLE IF EXISTS write_logs CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
