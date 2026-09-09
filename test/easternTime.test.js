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
  const now = new Date('2026-09-08T22:00:00Z')
  assert.equal(daysUntilDue('2026-09-11', now), 3)
  assert.equal(daysUntilDue('2026-09-08', now), 0)
  assert.equal(daysUntilDue('2026-09-07', now), -1)
})

test('keeps deadlines in either occurrence of the repeated eastern hour', () => {
  const now = new Date('2026-10-30T16:00:00Z')
  for (const deadline of ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z']) {
    const { date } = splitEasternDateTime(deadline)
    assert.equal(daysUntilDue(date, now), 2)
    assert.equal(daysUntilDue(deadline, now), 2)
  }
})

test('uses eastern dates for instants and calendar days across daylight saving changes', () => {
  assert.equal(daysUntilDue('2026-09-05T02:00:00Z', new Date('2026-09-04T16:00:00Z')), 0)
  assert.equal(daysUntilDue('2026-03-09', new Date('2026-03-07T17:00:00Z')), 2)
  assert.equal(daysUntilDue('2026-11-02', new Date('2026-10-31T16:00:00Z')), 2)
})

test('returns null for invalid calendar day inputs', () => {
  for (const dueDate of [null, undefined, '', 'invalid', '2026-02-30']) {
    assert.equal(daysUntilDue(dueDate), null)
  }
  assert.equal(daysUntilDue('2026-09-08', new Date('invalid')), null)
})
