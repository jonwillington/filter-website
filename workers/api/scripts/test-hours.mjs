// Unit checks for src/hours.ts against the formats found in production data.
// Run: node scripts/test-hours.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';

const result = await build({
  entryPoints: [new URL('../src/hours.ts', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
});
const { parseOpeningHours } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

/** weekday → "status:open-close,open-close" */
function summary(raw) {
  const out = {};
  for (const d of parseOpeningHours(raw).days) {
    out[d.weekday] = `${d.status}:${d.ranges.map(r => `${r.open}-${r.close}`).join(',')}`;
  }
  return out;
}

const cases = [
  ['Google text', ['Monday: 8:00 AM – 6:00 PM', 'Tuesday: Closed', 'Wednesday: Open 24 hours'], { 1: 'open:08:00-18:00', 2: 'closed:', 3: 'open24h:', 4: 'unknown:' }],
  ['narrow no-break spaces', ['Monday: 8:00 AM – 6:00 PM'], { 1: 'open:08:00-18:00' }],
  ['implied opening meridiem', ['Thursday: 8:00 – 11:30 AM, 12:00 – 3:00 PM, 6:00 – 11:30 PM'], { 4: 'open:08:00-11:30,12:00-15:00,18:00-23:30' }],
  ['implied morning before PM', ['Friday: 9:00 AM – 1:00 PM, 2:30 – 8:00 PM', 'Monday: 11:00 – 2:00 PM'], { 5: 'open:09:00-13:00,14:30-20:00', 1: 'open:11:00-14:00' }],
  ['noon start', ['Monday: 12:00 – 10:00 PM'], { 1: 'open:12:00-22:00' }],
  ['past midnight', ['Tuesday: 9:30 AM – 12:15 AM', 'Monday: 9:00 AM – 2:00 AM'], { 2: 'open:09:30-00:15', 1: 'open:09:00-02:00' }],
  ['24h with note', ['Saturday: 08:00 - 17:00 (Open daily)', 'Monday: 07:00-11:00, 12:00-15:00'], { 6: 'open:08:00-17:00', 1: 'open:07:00-11:00,12:00-15:00' }],
  ['day-keyed map', { friday: '7:30-16:30 & 18:00-22:00', monday: '7:30am - 8pm', sunday: 'Open by Chance', notes: 'ignored', saturday: '8am - 4pm', tuesday: null }, { 5: 'open:07:30-16:30,18:00-22:00', 1: 'open:07:30-20:00', 7: 'unknown:', 6: 'open:08:00-16:00', 2: 'unknown:' }],
  ['day objects', [{ day: 'Monday', open: '08:00', close: '18:00' }], { 1: 'open:08:00-18:00', 2: 'unknown:' }],
  ['short day objects', [{ day: 'mon', open: '9:00 AM', close: '6:00 PM' }], { 1: 'open:09:00-18:00' }],
  ['dayOfWeek objects', [{ dayOfWeek: 'monday', openTime: '08:30', closeTime: '17:00', isClosed: false }, { dayOfWeek: 'sunday', isClosed: true }], { 1: 'open:08:30-17:00', 7: 'closed:' }],
  ['daily line', ['Daily: 10:30 AM – 7:00 PM', 'Sunday: Closed'], { 1: 'open:10:30-19:00', 6: 'open:10:30-19:00', 7: 'closed:' }],
  ['JSON string input', JSON.stringify(['Monday: 8:00 AM – 6:00 PM']), { 1: 'open:08:00-18:00' }],
];

for (const [name, raw, expected] of cases) {
  const actual = summary(raw);
  for (const [day, value] of Object.entries(expected)) {
    assert.equal(actual[day], value, `${name}: weekday ${day}`);
  }
  assert.equal(Object.keys(actual).length, 7, `${name}: seven days`);
}
assert.equal(parseOpeningHours(null), null);
assert.equal(parseOpeningHours({}), null);
assert.equal(parseOpeningHours('not json'), null);

console.log(`hours: ${cases.length + 3} checks passed`);
