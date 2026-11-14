import test from 'node:test'
import assert from 'node:assert/strict'
import getSyntax from '@logic-app/logic-engine/symbolic/libsyntax.js'
import { arrowShortcutBeforeCaret, scanBrackets, typedEdit } from '../src/components/ui/logic-engine/formulaEditing.js'

// what the field holds after typing one key with the caret at the end
const press = (value, key, notation) => (
  typedEdit(value, value.length, value.length, key, { notation })?.text ?? value + key
)

test('picks the connective and how much ascii arrow a typed > replaces', () => {
  assert.deepEqual(arrowShortcutBeforeCaret('P<-'), { op: 'IFF', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<--'), { op: 'IFF', replaceBefore: 3 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<–'), { op: 'IFF', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<='), { op: 'IFF', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<'), { op: 'IFF', replaceBefore: 1 })
  // derivation lines pad = like identity as it is typed
  assert.deepEqual(arrowShortcutBeforeCaret('P< = '), { op: 'IFF', replaceBefore: 4 })
  assert.deepEqual(arrowShortcutBeforeCaret('P = '), { op: 'IFTHEN', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P--'), { op: 'IFTHEN', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P='), { op: 'IFTHEN', replaceBefore: 1 })
  assert.deepEqual(arrowShortcutBeforeCaret('P-='), { op: 'IFTHEN', replaceBefore: 1 })
  assert.deepEqual(arrowShortcutBeforeCaret('a=b'), { op: 'IFTHEN', replaceBefore: 0 })
  assert.deepEqual(arrowShortcutBeforeCaret(''), { op: 'IFTHEN', replaceBefore: 0 })
})

for (const notation of ['calgary', 'hurley']) {
  const { IFF, IFTHEN, NOT, AND, OR, FALSUM, FORALL } = getSyntax(notation).symbols

  test(`${notation} turns every ascii biconditional into one connective`, () => {
    for (const typed of ['P<-', 'P<--', 'P<–', 'P<=', 'P< = ', 'P<', 'P <-']) {
      assert.equal(press(typed, '>', notation), `P ${IFF} `, typed)
    }
    assert.equal(press('~(P<-', '>', notation), `~(P ${IFF} `)
  })

  test(`${notation} turns every ascii conditional into one connective`, () => {
    for (const typed of ['P-', 'P--', 'P–', 'P=', 'P = ', 'P']) {
      assert.equal(press(typed, '>', notation), `P ${IFTHEN} `, typed)
    }
    assert.equal(press('', '>', notation), ` ${IFTHEN} `)
  })

  test(`${notation} reads # and a doubled X as falsum`, () => {
    assert.equal(press('P ' + IFTHEN + ' ', '#', notation), `P ${IFTHEN} ${FALSUM}`)
    assert.equal(press('X', 'X', notation), ` ${FALSUM}`)
  })

  test(`${notation} only consumes an arrow that touches the caret`, () => {
    assert.equal(press('P<Q-', '>', notation), `P<Q ${IFTHEN} `)
    assert.equal(press('a=b', '>', notation), `a=b ${IFTHEN} `)
    assert.equal(press('P-=', '>', notation), `P- ${IFTHEN} `)
  })

  test(`${notation} spaces connectives and reads the other shortcuts`, () => {
    assert.equal(press('P', '.', notation), `P ${AND} `)
    assert.equal(press('P', 'v', notation), `P ${OR} `)
    assert.equal(press('P&', '&', notation), `P ${AND} `)
    assert.equal(press(press('P', '|', notation), '|', notation), `P ${OR} `)
    assert.equal(press(press('P', '&', notation), '&', notation), `P ${AND} `)
    assert.equal(press('', '~', notation), NOT)
    assert.equal(press('--', 'P', notation), `${NOT}${NOT}P`)
    assert.equal(press('P ', ' ', notation), 'P ')
    assert.equal(press('al', 'l', notation), FORALL)
  })
}

test('brackets report what is still open, what tab closes and the pair and scope at the caret', () => {
  assert.equal(scanBrackets('[(A ∨ B) → C').pending, ']')
  assert.equal(scanBrackets('{[(').pending, ')]}')
  assert.equal(scanBrackets('(A ∨ B]').pending, ')')
  assert.equal(scanBrackets('((A', 3).closer, ')')
  assert.equal(scanBrackets('(A ∨ B)', 3).closer, '')
  assert.equal(scanBrackets('(A', 0).closer, '')
  assert.deepEqual(scanBrackets('(A ∨ B)', 7).pair, [6, 0])
  assert.deepEqual(scanBrackets('((A', 3).pair, [3, 1])
  assert.deepEqual(scanBrackets('(A ∨ B)', 3).pair, [])
  assert.deepEqual(scanBrackets('∀x∀y((C(x', 9).scope, { from: 7, to: 9, greyed: 1 })
  assert.deepEqual(scanBrackets('(A ∨ B) → C', 3).scope, { from: 0, to: 7, greyed: 0 })
  assert.equal(scanBrackets('(A ∨ B) → C', 9).scope, null)
})
