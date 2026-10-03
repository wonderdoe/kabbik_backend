const DB = require('../db');

const SQL = `
  SELECT
    platform,
    (
      is_under_maintenance = 1
      AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP())
      AND (ends_at   IS NULL OR ends_at   >  UTC_TIMESTAMP())
    ) AS is_active,
    title_en, title_bn, message_en, message_bn, starts_at, ends_at
  FROM app_maintenance_status
  WHERE (? IS NULL OR platform = ?)
`;

const mapRow = (r) => ({
  platform: r.platform,
  isUnderMaintenance: Boolean(r.is_active),
  title: { en: r.title_en, bn: r.title_bn },
  message: { en: r.message_en, bn: r.message_bn },
  startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
  endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
});

class MaintenanceStatusModel {
  getStatus = async (platform = null) => {
    const rows = await DB.query(SQL, [platform, platform]);
    return rows.map(mapRow);
  };
}

module.exports = new MaintenanceStatusModel();
