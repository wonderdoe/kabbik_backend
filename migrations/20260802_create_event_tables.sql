-- Events and event participation tables migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260802_create_event_tables.sql

CREATE TABLE events (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL COMMENT 'creator/admin',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100),
  location VARCHAR(255),
  event_date_time DATETIME NOT NULL,
  maxSeat INT UNSIGNED NOT NULL,
  joined_count INT UNSIGNED DEFAULT 0,
  tag VARCHAR(100),
  tagColor VARCHAR(20),
  banner_image LONGTEXT,
  status TINYINT DEFAULT 1 COMMENT '1=active, 2=cancelled, 3=completed',
  deleted TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_creator (user_id),
  INDEX idx_event_date (event_date_time),
  INDEX idx_status (status),
  INDEX idx_joined_count (joined_count DESC),
  INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_joins (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status TINYINT DEFAULT 1 COMMENT '1=joined, 2=cancelled, 3=waitlisted',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_join (event_id, user_id),
  INDEX idx_event_id (event_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_joined_at (joined_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
