--migrate:up
-- NGワードテーブル
CREATE TABLE ng_words(
    id UUID PRIMARY KEY,
    word TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ng_words_word ON ng_words(word);

-- スレッド管理用カラム追加
ALTER TABLE threads
    ADD COLUMN is_stopped BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN is_pooled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN max_responses INTEGER NOT NULL DEFAULT 1000;

-- 管理者操作ログテーブル
CREATE TABLE admin_logs(
    id UUID PRIMARY KEY,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- IP制限テーブル
CREATE TABLE ip_restrictions(
    id UUID PRIMARY KEY,
    ip_or_cidr TEXT NOT NULL,
    restriction_type TEXT NOT NULL CHECK (restriction_type IN ('deny', 'allow')),
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ip_restrictions_type ON ip_restrictions(restriction_type);

-- 管理者ユーザーテーブル（複数管理者対応）
CREATE TABLE admin_users(
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 管理者グループテーブル
CREATE TABLE admin_groups(
    id UUID PRIMARY KEY,
    group_name TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 管理者ユーザーとグループの関連テーブル
CREATE TABLE admin_user_groups(
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES admin_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- デフォルトの管理者ユーザーをconfigから移行
INSERT INTO admin_users(id, username, password_hash, full_name, is_super_admin)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin',
    admin_password,
    'Administrator',
    TRUE
FROM config
LIMIT 1;

-- プラグインレジストリテーブル
CREATE TABLE plugin_registry(
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    hook_type INTEGER NOT NULL DEFAULT 0,
    config_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- configにスパム検知とcaptchaの設定を追加
ALTER TABLE config
    ADD COLUMN enable_spam_detection BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN spam_threshold INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN captcha_provider TEXT NOT NULL DEFAULT 'none',
    ADD COLUMN captcha_site_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN captcha_secret_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN enable_dnsbl BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN dnsbl_hostnames TEXT NOT NULL DEFAULT '',
    ADD COLUMN enable_vpn_detection BOOLEAN NOT NULL DEFAULT FALSE;

--migrate:down
ALTER TABLE config
    DROP COLUMN IF EXISTS enable_vpn_detection,
    DROP COLUMN IF EXISTS dnsbl_hostnames,
    DROP COLUMN IF EXISTS enable_dnsbl,
    DROP COLUMN IF EXISTS captcha_secret_key,
    DROP COLUMN IF EXISTS captcha_site_key,
    DROP COLUMN IF EXISTS captcha_provider,
    DROP COLUMN IF EXISTS spam_threshold,
    DROP COLUMN IF EXISTS enable_spam_detection;

DROP TABLE IF EXISTS plugin_registry CASCADE;
DROP TABLE IF EXISTS admin_user_groups CASCADE;
DROP TABLE IF EXISTS admin_groups CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS ip_restrictions CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS ng_words CASCADE;

ALTER TABLE threads
    DROP COLUMN IF EXISTS max_responses,
    DROP COLUMN IF EXISTS is_pooled,
    DROP COLUMN IF EXISTS is_stopped;
