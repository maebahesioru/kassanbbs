--migrate:up
CREATE INDEX IF NOT EXISTS idx_responses_hash_id ON responses(hash_id);
CREATE INDEX IF NOT EXISTS idx_thread_votes_thread_id ON thread_votes(thread_id);
CREATE INDEX IF NOT EXISTS idx_notices_active ON notices(is_active, target_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_ip_restrictions_ip ON ip_restrictions(ip_or_cidr);
CREATE INDEX IF NOT EXISTS idx_plugin_registry_hook ON plugin_registry(hook_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_threads_auto_delete ON threads(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

--migrate:down
DROP INDEX IF EXISTS idx_threads_auto_delete;
DROP INDEX IF EXISTS idx_plugin_registry_hook;
DROP INDEX IF EXISTS idx_ip_restrictions_ip;
DROP INDEX IF EXISTS idx_admin_users_username;
DROP INDEX IF EXISTS idx_banners_position;
DROP INDEX IF EXISTS idx_notices_active;
DROP INDEX IF EXISTS idx_thread_votes_thread_id;
DROP INDEX IF EXISTS idx_responses_hash_id;
