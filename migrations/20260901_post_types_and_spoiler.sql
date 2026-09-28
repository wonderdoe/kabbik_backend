-- Post types and spoiler flag migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260901_post_types_and_spoiler.sql
--
-- After deploy, verify feed index usage locally:
-- EXPLAIN SELECT p.id FROM posts p WHERE p.deleted = 0 AND p.post_type_id = ? ORDER BY p.created_at DESC LIMIT 20;

CREATE TABLE post_types (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_slug (slug),
  INDEX idx_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO post_types (name, slug, sort_order, is_active) VALUES
  ('Audio Book Review', 'audiobook_review', 1, 1),
  ('Question', 'question', 2, 1),
  ('Discussion', 'discussion', 3, 1),
  ('Recommendation', 'recommendation', 4, 1);

ALTER TABLE posts
  ADD COLUMN post_type_id INT UNSIGNED NULL AFTER audiobook_id,
  ADD COLUMN is_spoiler TINYINT(1) NOT NULL DEFAULT 0 AFTER content;

UPDATE posts
SET post_type_id = (SELECT id FROM post_types WHERE slug = 'discussion' LIMIT 1)
WHERE post_type_id IS NULL;

ALTER TABLE posts
  MODIFY COLUMN post_type_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_posts_post_type
    FOREIGN KEY (post_type_id) REFERENCES post_types(id) ON DELETE RESTRICT,
  ADD INDEX idx_type_deleted_created (post_type_id, deleted, created_at);
