-- UTC timestamp policy migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260811_standardize_utc_timestamps.sql
--
-- Ensures audit columns on engagement/community tables use TIMESTAMP (UTC storage)
-- and fixes blog_stats view to use the blog_comments table name used by the app.
-- If blog_comments.deleted already exists, skip the ALTER TABLE statement below.

ALTER TABLE blog_comments
  ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0;

CREATE OR REPLACE VIEW blog_stats AS
SELECT
  b.id AS blog_id,
  COALESCE(likes.like_count, 0)       AS likeCount,
  COALESCE(likes.dislike_count, 0)    AS dislikeCount,
  COALESCE(comments.comment_count, 0) AS commentCount,
  COALESCE(shares.share_count, 0)     AS shareCount
FROM blogs b
LEFT JOIN (
  SELECT blog_id,
    SUM(CASE WHEN reaction_type = 1 THEN 1 ELSE 0 END) AS like_count,
    SUM(CASE WHEN reaction_type = 2 THEN 1 ELSE 0 END) AS dislike_count
  FROM blog_reactions GROUP BY blog_id
) AS likes ON likes.blog_id = b.id
LEFT JOIN (
  SELECT blogId, COUNT(*) AS comment_count
  FROM blog_comments
  WHERE deleted = 0
  GROUP BY blogId
) AS comments ON comments.blogId = b.id
LEFT JOIN (
  SELECT blog_id, COUNT(*) AS share_count
  FROM blog_shares GROUP BY blog_id
) AS shares ON shares.blog_id = b.id
WHERE b.deleted = 0;
