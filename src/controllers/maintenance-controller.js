const MaintenanceStatusModel = require('../data/models/maintenance-status-model');
const LoggerError = require('../utils/logger-error');

const FALLBACK = (p) => ({
  platform: p,
  isUnderMaintenance: false,
  title: { en: null, bn: null },
  message: { en: null, bn: null },
  startsAt: null,
  endsAt: null,
});

const getMaintenanceStatus = async (req, res) => {
  const { platform } = req.query;
  if (platform && !['app', 'website'].includes(platform)) {
    return res.status(400).json({ error: 'platform must be app or website' });
  }

  res.set('Cache-Control', 'public, max-age=15');
  const serverTime = new Date().toISOString();

  try {
    const list = await MaintenanceStatusModel.getStatus(platform || null);
    if (platform) {
      if (!list.length) {
        return res.status(404).json({ error: 'platform not found' });
      }
      return res.json({ ...list[0], serverTime });
    }
    const byPlatform = Object.fromEntries(
      list.map(({ platform: p, ...rest }) => [p, { platform: p, ...rest }])
    );
    return res.json({ ...byPlatform, serverTime });
  } catch (err) {
    console.error('maintenance-status failed:', err);
    LoggerError.log(err);
    if (platform) {
      return res.json({ ...FALLBACK(platform), serverTime });
    }
    return res.json({
      app: FALLBACK('app'),
      website: FALLBACK('website'),
      serverTime,
    });
  }
};

module.exports = { getMaintenanceStatus };
