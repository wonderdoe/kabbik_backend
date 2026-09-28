-- Reddit-style hot ranking columns for posts
-- Apply manually: mysql -u <user> -p <database> < migrations/20260903_trending_posts_reddit_hot.sql

ALTER TABLE posts
  ADD COLUMN trending_score DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN trending_updated_at TIMESTAMP NULL;

ALTER TABLE posts
  ADD INDEX idx_trending_feed (deleted, trending_score DESC),
  ADD INDEX idx_type_trending (post_type_id, deleted, trending_score DESC);
