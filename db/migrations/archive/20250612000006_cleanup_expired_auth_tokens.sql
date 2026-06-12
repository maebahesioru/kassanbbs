--migrate:up
DELETE FROM auth_tokens WHERE expires_at < NOW() - INTERVAL '7 days';

--migrate:down
-- No rollback for data cleanup
