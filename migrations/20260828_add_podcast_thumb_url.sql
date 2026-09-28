-- Podcast thumb_url migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260828_add_podcast_thumb_url.sql
--
-- No separate backfill step: DEFAULT covers any existing rows in dev/staging.

ALTER TABLE podcast
  ADD COLUMN thumb_url VARCHAR(500) NOT NULL DEFAULT 'https://cdn.kabbik.com/podcasts/default-thumb.png';
