-- Add payload JSON column to promotion_banners
-- Apply manually: mysql -u <user> -p <database> < migrations/20260921_add_payload_to_promotion_banners.sql

ALTER TABLE promotion_banners
  ADD COLUMN payload JSON DEFAULT NULL AFTER is_active;
