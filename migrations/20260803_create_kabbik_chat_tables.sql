-- Kabbik Chat (Interact with Kabbik) tables migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260803_create_kabbik_chat_tables.sql

CREATE TABLE kabbik_conversations (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  subject VARCHAR(255),
  status TINYINT DEFAULT 1 COMMENT '1=open, 2=closed',
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_conversation (user_id) COMMENT 'one active thread per user',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_last_message_at (last_message_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE kabbik_messages (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT UNSIGNED NOT NULL,
  sender_type TINYINT NOT NULL COMMENT '1=user, 2=admin/kabbik',
  sender_id INT UNSIGNED NOT NULL COMMENT 'user_id or admin user id',
  message LONGTEXT NOT NULL,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES kabbik_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation_id (conversation_id, created_at ASC),
  INDEX idx_sender_id (sender_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
