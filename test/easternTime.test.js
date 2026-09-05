import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCurrentEasternDate,
  splitEasternDateTime,
  toEasternIso,
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
