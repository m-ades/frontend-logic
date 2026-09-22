import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeLogicSystem } from '../src/lib/logicSystems.js'

test('normalizeLogicSystem is case-insensitive for system ids and aliases', () => {
  assert.equal(normalizeLogicSystem('FITCH'), 'fitch')
  assert.equal(normalizeLogicSystem('Hurley'), 'hurley')
  assert.equal(normalizeLogicSystem('Calgary'), 'fitch')
  assert.equal(normalizeLogicSystem('FORALLX'), 'fitch')
})

test('normalizeLogicSystem still falls back for unrecognized values', () => {
  assert.equal(normalizeLogicSystem('not-a-system'), 'fitch')
  assert.equal(normalizeLogicSystem('not-a-system', 'hurley'), 'hurley')
  assert.equal(normalizeLogicSystem(undefined), 'fitch')
})
