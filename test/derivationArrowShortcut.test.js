import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyInsertion,
  arrowShortcutBeforeCaret,
} from '../src/components/problems/derivation/derivationTableConfig.js'
import { getSymbols } from '../src/lib/logicSystems.js'

// what the formula field holds after > is pressed at the end of value
const pressGreaterThan = (value, logicSystem) => {
  const { connective, replaceBefore } = arrowShortcutBeforeCaret(value)
  const symbol = getSymbols(logicSystem)[connective]
  return applyInsertion(value, value.length, value.length, symbol, replaceBefore).nextValue
}

for (const logicSystem of ['hurley', 'fitch']) {
  const { conditional, biconditional } = getSymbols(logicSystem)

  test(`${logicSystem} turns <-> and its variants into a biconditional`, () => {
    assert.equal(pressGreaterThan('P<-', logicSystem), `P${biconditional}`)
    assert.equal(pressGreaterThan('P<--', logicSystem), `P${biconditional}`)
    assert.equal(pressGreaterThan('P<–', logicSystem), `P${biconditional}`)
    assert.equal(pressGreaterThan('P<', logicSystem), `P${biconditional}`)
    assert.equal(pressGreaterThan('~(P<-', logicSystem), `~(P${biconditional}`)
    assert.equal(pressGreaterThan('P<=', logicSystem), `P${biconditional}`)
  })

  test(`${logicSystem} keeps -> and --> as a conditional`, () => {
    assert.equal(pressGreaterThan('P-', logicSystem), `P${conditional}`)
    assert.equal(pressGreaterThan('P--', logicSystem), `P${conditional}`)
    assert.equal(pressGreaterThan('P–', logicSystem), `P${conditional}`)
    assert.equal(pressGreaterThan('P', logicSystem), `P${conditional}`)
    assert.equal(pressGreaterThan('', logicSystem), conditional)
    assert.equal(pressGreaterThan('P=', logicSystem), `P${conditional}`)
  })

  test(`${logicSystem} only consumes an arrow that touches the caret`, () => {
    assert.equal(pressGreaterThan('P<Q-', logicSystem), `P<Q${conditional}`)
    assert.equal(pressGreaterThan('(P<-Q) ', logicSystem), `(P<-Q) ${conditional}`)
    assert.equal(pressGreaterThan('a=b', logicSystem), `a=b${conditional}`)
    assert.equal(pressGreaterThan('P-=', logicSystem), `P-${conditional}`)
  })
}
