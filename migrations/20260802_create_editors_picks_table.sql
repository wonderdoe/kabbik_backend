-- Editor's Pick curated audiobooks table migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260802_create_editors_picks_table.sql

CREATE TABLE editors_picks (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  audiobook_id INT UNSIGNED NOT NULL,
  editor_id INT UNSIGNED NOT NULL COMMENT 'FK users.id (admin who created the pick)',
  cap_title VARCHAR(255) COMMENT 'short display title/tag shown on the pick card',
  caption VARCHAR(500) COMMENT 'editor note/blurb',
  banner LONGTEXT COMMENT 'banner image URL for this pick',
  position INT UNSIGNED DEFAULT 0 COMMENT 'display order, ascending',
  start_date DATETIME COMMENT 'when to show (NULL = immediately)',
  end_date DATETIME COMMENT 'when to hide (NULL = indefinite)',
  is_active TINYINT DEFAULT 1,
  deleted TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id) ON DELETE CASCADE,
  FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_is_active (is_active),
  INDEX idx_position (position),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_audiobook_id (audiobook_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
