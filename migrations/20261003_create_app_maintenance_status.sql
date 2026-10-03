-- App and website maintenance flags (GET /api/maintenance-status)
-- Apply manually: mysql -u <user> -p <database> < migrations/20261003_create_app_maintenance_status.sql

CREATE TABLE IF NOT EXISTS app_maintenance_status (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform              ENUM('app','website') NOT NULL,
  is_under_maintenance  TINYINT(1) NOT NULL DEFAULT 0,
  title_en              VARCHAR(150) NULL,
  title_bn              VARCHAR(150) NULL,
  message_en            VARCHAR(500) NULL,
  message_bn            VARCHAR(500) NULL,
  starts_at             DATETIME NULL,
  ends_at               DATETIME NULL,
  updated_by            VARCHAR(100) NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_maintenance_status
  (platform, is_under_maintenance, title_en, title_bn, message_en, message_bn)
SELECT 'app', 0, 'Under Maintenance', 'রক্ষণাবেক্ষণ চলছে', 'We will be back shortly.', 'আমরা শীঘ্রই ফিরে আসব।'
WHERE NOT EXISTS (SELECT 1 FROM app_maintenance_status WHERE platform = 'app' LIMIT 1);

INSERT INTO app_maintenance_status
  (platform, is_under_maintenance, title_en, title_bn, message_en, message_bn)
SELECT 'website', 0, 'Under Maintenance', 'রক্ষণাবেক্ষণ চলছে', 'We will be back shortly.', 'আমরা শীঘ্রই ফিরে আসব।'
WHERE NOT EXISTS (SELECT 1 FROM app_maintenance_status WHERE platform = 'website' LIMIT 1);
