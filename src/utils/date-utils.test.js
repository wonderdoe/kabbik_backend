const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DHAKA_TZ,
  calendarDateInZone,
  addCalendarDaysInZone,
  subscriptionExpiryDateInZone,
  formatInstantUtc,
  formatTimestamps,
} = require('./date-utils');

test('formatInstantUtc converts Date to ISO UTC', () => {
  const date = new Date('2026-07-30T10:00:00.000Z');
  assert.equal(formatInstantUtc(date), '2026-07-30T10:00:00.000Z');
});

test('formatInstantUtc converts MySQL datetime strings as UTC', () => {
  assert.equal(
    formatInstantUtc('2026-07-30 10:00:00'),
    '2026-07-30T10:00:00.000Z'
  );
});

test('formatTimestamps formats audit fields', () => {
  const formatted = formatTimestamps({
    id: 1,
    created_at: '2026-07-30 10:00:00',
    updated_at: new Date('2026-07-30T11:00:00.000Z'),
  });

  assert.equal(formatted.created_at, '2026-07-30T10:00:00.000Z');
  assert.equal(formatted.updated_at, '2026-07-30T11:00:00.000Z');
});

test('calendarDateInZone uses Asia/Dhaka calendar not process TZ', () => {
  const cases = [
    ['2026-08-25T19:50:00.000Z', '2026-08-26'],
    ['2026-08-25T17:59:59.000Z', '2026-08-25'],
    ['2026-08-25T18:00:00.000Z', '2026-08-26'],
    ['2026-08-26T00:00:00.000Z', '2026-08-26'],
    ['2028-02-28T20:00:00.000Z', '2028-02-29'],
  ];

  for (const [instant, expected] of cases) {
    assert.equal(
      calendarDateInZone(DHAKA_TZ, new Date(instant)),
      expected,
      `instant ${instant}`
    );
  }
});

test('subscriptionExpiryDateInZone applies +2y -2d on Dhaka calendar', () => {
  assert.equal(
    subscriptionExpiryDateInZone(DHAKA_TZ, new Date('2026-08-25T19:50:00.000Z')),
    '2028-08-24'
  );
  assert.equal(
    subscriptionExpiryDateInZone(DHAKA_TZ, new Date('2028-02-28T20:00:00.000Z')),
    '2030-02-26'
  );
});

test('addCalendarDaysInZone adds days on Dhaka calendar', () => {
  const instant = new Date('2026-08-25T19:50:00.000Z');
  assert.equal(
    addCalendarDaysInZone(DHAKA_TZ, 7, instant),
    '2026-09-02'
  );
  assert.equal(
    subscriptionExpiryDateInZone(DHAKA_TZ, instant, 7),
    '2028-08-31'
  );
});
