-- Add target_audience column to promotion_banners
-- Apply manually: mysql -u <user> -p <database> < migrations/20260921_add_target_audience_to_promotion_banners.sql

ALTER TABLE promotion_banners
  ADD COLUMN target_audience VARCHAR(255) DEFAULT NULL AFTER payload;
