import test from 'node:test'
import assert from 'node:assert/strict'
import getFormulaClass from '@logic-app/logic-engine/symbolic/formula.js'
import { formatDerivationRuleName } from '../src/lib/derivationRules.js'

for (const notation of ['calgary', 'hurley']) {
  const Formula = getFormulaClass(notation)

  test(`${notation} formulas accept ! and == like the backend`, () => {
    assert.equal(Formula.from('!A').normal, Formula.from('~A').normal)
    assert.equal(Formula.from('A==B').normal, Formula.from('A<->B').normal)
    assert.equal(Formula.from('!A').wellformed, true)
  })
}

test('rule names read ! and == like the backend', () => {
  assert.equal(formatDerivationRuleName('!E'), formatDerivationRuleName('~E'))
  assert.equal(formatDerivationRuleName('==I'), formatDerivationRuleName('<->I'))
})
