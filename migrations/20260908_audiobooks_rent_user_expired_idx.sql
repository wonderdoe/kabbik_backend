-- Add composite index on audiobooks_rent(user_id, expired_at) to support
-- efficient filtering for active/expired user rent queries.
ALTER TABLE audiobooks_rent
  ADD INDEX IF NOT EXISTS idx_rent_user_expired (user_id, expired_at);
