-- Reddit-style hot ranking columns for podcasts
-- Apply manually: mysql -u <user> -p <database> < migrations/20260910_podcast_trending.sql

ALTER TABLE podcast
  ADD COLUMN trending_score DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN trending_updated_at TIMESTAMP NULL;

ALTER TABLE podcast
  ADD INDEX idx_podcast_trending (trending_score DESC, id DESC);
