-- Podcast module tables migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260825_create_podcast_tables.sql
-- Skip CREATE TABLE statements if tables already exist in your environment.

CREATE TABLE IF NOT EXISTS tag (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tag_slug (slug),
  INDEX idx_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS podcast (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  is_premium TINYINT NOT NULL DEFAULT 0,
  podcast_url VARCHAR(2048) NULL,
  thumb_url VARCHAR(500) NOT NULL DEFAULT 'https://cdn.kabbik.com/podcasts/default-thumb.png',
  like_count INT UNSIGNED NOT NULL DEFAULT 0,
  dislike_count INT UNSIGNED NOT NULL DEFAULT 0,
  comment_count INT UNSIGNED NOT NULL DEFAULT 0,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_podcast_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS podcast_reaction (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  podcast_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  reaction_type ENUM('like', 'dislike') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (podcast_id) REFERENCES podcast(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_podcast (user_id, podcast_id),
  INDEX idx_podcast_reaction_podcast_id (podcast_id),
  INDEX idx_podcast_reaction_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS podcast_tag (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  podcast_id INT UNSIGNED NOT NULL,
  tag_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (podcast_id) REFERENCES podcast(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE,
  UNIQUE KEY uq_podcast_tag (podcast_id, tag_id),
  INDEX idx_podcast_tag_podcast_id (podcast_id),
  INDEX idx_podcast_tag_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
