import test from 'node:test'
import assert from 'node:assert/strict'
import derivationCalgary from '../src/lib/logicpenguin/checkers/derivation-calgary.js'

test('fitch allows eliminating the right disjunct and reports extra citations without a directional restriction', async () => {
  const question = { prems: ['R', 'P ∨ Q', '¬Q'], conc: 'P' }
  const premises = question.prems.map((s, index) => ({ n: String(index + 1), s, j: 'Pr' }))
  for (const [justification, expectedStatus] of [['DS 2,3', 'correct'], ['DS 1,2,3', 'incorrect']]) {
    const result = await derivationCalgary(question, null, {
      parts: [...premises, { n: '4', s: 'P', j: justification }],
    }, false, 1, false, { notation: 'calgary' })

    assert.equal(result.successstatus, expectedStatus)
    assert.equal(result.errors?.['4']?.rule?.high?.['DS eliminates only the left disjunct'], undefined)
    if (expectedStatus === 'incorrect') {
      assert.ok(result.errors?.['4']?.justification?.low?.['cites the wrong number of lines for the rule specified'])
    }
  }
})
