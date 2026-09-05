import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPublicationPayload,
  projectPublicationState,
} from '../src/utils/publicationPolicy.js'

const now = new Date('2026-09-04T16:00:00Z')

test('builds manual lock and immediate publication payloads', () => {
  assert.deepEqual(buildPublicationPayload({ isLocked: true }, now), {
    publish_at: null,
    is_locked: true,
  })
  assert.deepEqual(buildPublicationPayload({ isLocked: false }, now), {
    publish_at: null,
    is_locked: false,
  })
})

test('derives publication state from a new york schedule', () => {
  assert.deepEqual(buildPublicationPayload({
    isLocked: false,
    publishDate: '2026-09-04',
    publishTime: '12:01',
  }, now), {
    publish_at: '2026-09-04T12:01:00-04:00',
    is_locked: true,
  })
  assert.deepEqual(buildPublicationPayload({
    isLocked: true,
    publishDate: '2026-09-04',
    publishTime: '11:59',
  }, now), {
    publish_at: '2026-09-04T11:59:00-04:00',
    is_locked: false,
  })
})

test('rejects invalid and ambiguous schedules', () => {
  assert.equal(buildPublicationPayload({
    publishDate: '2026-03-08',
    publishTime: '02:30',
  }, now), null)
  assert.equal(buildPublicationPayload({
    publishDate: '2026-11-01',
    publishTime: '01:30',
  }, now), null)
})

test('projects the effective state without mutating stored schedule fields', () => {
  assert.deepEqual(projectPublicationState({
    id: 1,
    isLocked: true,
    publishAt: '2026-09-04T15:59:00Z',
  }, now), {
    id: 1,
    isLocked: false,
    isPublished: true,
    publishAt: '2026-09-04T15:59:00Z',
  })

  assert.equal(projectPublicationState({
    isLocked: false,
    publishAt: '2026-09-04T16:01:00Z',
  }, now).isLocked, true)
})
