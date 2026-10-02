-- Quick access shortcuts for mobile home (GET /api/v4/home/quick-access)
-- Apply manually: mysql -u <user> -p <database> < migrations/20261002_create_quick_access_table.sql

CREATE TABLE IF NOT EXISTS quick_access (
  id          INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  en_name     VARCHAR(255)   NOT NULL,
  bn_name     VARCHAR(255)   NOT NULL,
  goto_page   VARCHAR(255)   NOT NULL,
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  audience    ENUM('all', 'free', 'premium') NOT NULL DEFAULT 'all',
  sort_order  INT            NOT NULL DEFAULT 0,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_quick_access_active_audience_sort
  ON quick_access (is_active, audience, sort_order, id);

INSERT INTO quick_access (en_name, bn_name, goto_page, is_active, audience, sort_order)
SELECT 'Rent', 'রেন্ট', '/rent', 1, 'all', 10
WHERE NOT EXISTS (SELECT 1 FROM quick_access WHERE goto_page = '/rent' LIMIT 1);

INSERT INTO quick_access (en_name, bn_name, goto_page, is_active, audience, sort_order)
SELECT 'Store', 'স্টোর', '/store', 1, 'all', 20
WHERE NOT EXISTS (SELECT 1 FROM quick_access WHERE goto_page = '/store' LIMIT 1);
