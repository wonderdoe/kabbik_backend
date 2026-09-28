const moment = require('moment-timezone');

const DHAKA_TZ = 'Asia/Dhaka';

/**
 * Calendar date (YYYY-MM-DD) for an instant in the given IANA timezone.
 */
const calendarDateInZone = (timeZone, instant = new Date()) =>
  moment.tz(instant, timeZone).format('YYYY-MM-DD');

/**
 * Calendar date after adding days on the timezone's local calendar.
 */
const addCalendarDaysInZone = (timeZone, days, instant = new Date()) =>
  moment.tz(instant, timeZone).add(days, 'days').format('YYYY-MM-DD');

/**
 * bKash subscription expiry: +2 years −2 days on the timezone calendar, optional extra days (e.g. free trial).
 */
const subscriptionExpiryDateInZone = (
  timeZone,
  instant = new Date(),
  extraDays = 0
) =>
  moment
    .tz(instant, timeZone)
    .add(2, 'years')
    .subtract(2, 'days')
    .add(extraDays, 'days')
    .format('YYYY-MM-DD');

/**
 * Normalize database timestamps to ISO-8601 UTC strings for API responses.
 */
const formatInstantUtc = (value) => {
  if (value == null || value === '') return value;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? value : value.toISOString();
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      const date = new Date(`${trimmed.replace(' ', 'T')}Z`);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  return value;
};

const formatTimestamps = (obj, fields = ['created_at', 'updated_at']) => {
  if (!obj || typeof obj !== 'object') return obj;

  const formatted = { ...obj };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(formatted, field)) {
      formatted[field] = formatInstantUtc(formatted[field]);
    }
  }
  return formatted;
};

module.exports = {
  DHAKA_TZ,
  calendarDateInZone,
  addCalendarDaysInZone,
  subscriptionExpiryDateInZone,
  formatInstantUtc,
  formatTimestamps,
};
