import test from 'node:test'
import assert from 'node:assert/strict'
import derivationHurley from '../src/lib/logicpenguin/checkers/derivation-hurley.js'
import { getDerivationCheckerForLogicSystem } from '../src/lib/logicpenguin/checkers/derivation-by-logic-system.js'

const question = { prems: ['A'], conc: 'A' }

test('rejects an absent submission without throwing', async () => {
  for (const submission of [undefined, null]) {
    const result = await derivationHurley(question, submission, 1, {})

    assert.equal(result.successstatus, 'incorrect')
    assert.equal(result.points, 0)
    assert.ok(result.errors?.['??']?.justification?.high?.['no proof data'])
  }
})

test('handles absent or invalid subderivation parts without throwing', async () => {
  for (const submission of [{}, { parts: null }, { parts: {} }, { parts: [{ parts: null }] }]) {
    const result = await derivationHurley(question, submission, 1, {})

    assert.equal(result.successstatus, 'incorrect')
    assert.equal(result.points, 0)
  }
})

test('the checker wrapper does not substitute the answer key for a missing submission', async () => {
  const checker = getDerivationCheckerForLogicSystem('hurley')
  const answer = { parts: [{ n: '1', s: 'A', j: 'Pr' }] }
  const result = await checker(question, answer, undefined, false, 1, false, {})

  assert.equal(result.successstatus, 'incorrect')
  assert.equal(result.points, 0)
})
