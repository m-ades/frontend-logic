import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCurrentEasternDate,
  splitEasternDateTime,
  toEasternIso,
  daysUntilDue,
} from '../src/utils/easternTime.js'

test('uses the applicable new york offset across daylight saving time', () => {
  assert.equal(toEasternIso('2026-03-08', '00:00'), '2026-03-08T00:00:00-05:00')
  assert.equal(toEasternIso('2026-03-08', '03:00'), '2026-03-08T03:00:00-04:00')
  assert.equal(toEasternIso('2026-11-01', '00:00'), '2026-11-01T00:00:00-04:00')
})

test('rejects skipped and ambiguous new york wall clock times', () => {
  assert.equal(toEasternIso('2026-03-08', '02:30'), null)
  assert.equal(toEasternIso('2026-11-01', '01:30'), null)
})

test('projects instants into new york independently of the browser zone', () => {
  assert.deepEqual(splitEasternDateTime('2026-07-15T16:30:00Z'), {
    date: '2026-07-15',
    time: '12:30',
  })
  assert.equal(getCurrentEasternDate('2026-09-05T02:00:00Z'), '2026-09-04')
})

test('counts calendar days until a due date against its eastern date, not a UTC-midnight misread', () => {
  // 6pm EDT on Sept 8; due Sept 11 is 3 calendar days out (9th, 10th, 11th) --
  // the old `new Date('2026-09-11') - new Date()` math read the due date as
  // UTC midnight (8pm EDT the day before) and rounded up elapsed hours,
  // undercounting or overcounting depending on time of day.
  const now = new Date('2026-09-08T22:00:00Z')
  assert.equal(daysUntilDue('2026-09-11', undefined, now), 3)
  assert.equal(daysUntilDue('2026-09-11', '23:59', now), 3)
  // due today stays "0 days left" (today) for the whole day, even late in the
  // evening close to its 11:59pm deadline
  assert.equal(daysUntilDue('2026-09-08', '23:59', now), 0)
  assert.equal(daysUntilDue(null, '23:59', now), null)
})
