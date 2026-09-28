-- Podcast view_count + audit timestamps migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260826_add_podcast_view_count_and_timestamps.sql
--
-- Skip Step 1 if podcast.created_at already exists (e.g. from 20260825_create_podcast_tables.sql).
-- Existing rows receive migration-run time for new timestamp columns; no historical backfill.

-- Step 1: created_at / updated_at
ALTER TABLE podcast
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE podcast
  ADD INDEX idx_podcast_created_at (created_at);

-- Step 2: view_count (no index — trending query shape not defined yet)
ALTER TABLE podcast
  ADD COLUMN view_count INT UNSIGNED NOT NULL DEFAULT 0;
