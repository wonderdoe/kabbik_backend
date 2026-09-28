-- Promotion banners table migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260921_create_promotion_banners.sql

CREATE TABLE promotion_banners (
  id         INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  banner_url TEXT           NOT NULL,
  goto_page  VARCHAR(255)   NOT NULL,
  is_active  TINYINT(1)     NOT NULL DEFAULT 1,
  payload          JSON                    DEFAULT NULL,
  target_audience  VARCHAR(255)            DEFAULT NULL,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME                DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_promotion_banners_active
  ON promotion_banners (is_active, deleted_at);
