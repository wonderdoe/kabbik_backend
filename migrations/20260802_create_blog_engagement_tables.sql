-- Blog engagement tables migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260802_create_blog_engagement_tables.sql

CREATE TABLE blog_reactions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  blog_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  reaction_type TINYINT NOT NULL COMMENT '1=like, 2=dislike',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_reaction (blog_id, user_id),
  INDEX idx_blog_id (blog_id),
  INDEX idx_user_id (user_id),
  INDEX idx_reaction_type (reaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE blog_shares (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  blog_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  share_channel VARCHAR(50) COMMENT 'facebook, whatsapp, twitter, copy_link, internal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_blog_id (blog_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE blogComments
  ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0,
  ADD INDEX idx_deleted (deleted);

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
  FROM blogComments
  WHERE deleted = 0
  GROUP BY blogId
) AS comments ON comments.blogId = b.id
LEFT JOIN (
  SELECT blog_id, COUNT(*) AS share_count
  FROM blog_shares GROUP BY blog_id
) AS shares ON shares.blog_id = b.id
WHERE b.deleted = 0;
