import test from 'node:test'
import assert from 'node:assert/strict'
import FormulaInput, { arrowShortcutBeforeCaret } from '../src/components/ui/logic-engine/formula-input.js'

// stands in for the text input a formula field or derivation line hands the shared handler
const fakeField = (value, notation) => FormulaInput.attach({
  value,
  selectionStart: value.length,
  selectionEnd: value.length,
  readOnly: false,
  classList: { contains: () => false },
  setSelectionRange(start, end) {
    this.selectionStart = start
    this.selectionEnd = end
  },
  setRangeText(text) {
    this.value = this.value.slice(0, this.selectionStart) + text + this.value.slice(this.selectionEnd)
  },
  focus() {},
}, notation)

const press = (value, key, notation, modifiers = {}) => {
  const field = fakeField(value, notation)
  let prevented = false
  FormulaInput.keydown.call(field, { key, ...modifiers, preventDefault() { prevented = true } })
  return { value: field.value, prevented }
}

test('picks the connective and how much ascii arrow a typed > replaces', () => {
  assert.deepEqual(arrowShortcutBeforeCaret('P<-'), { op: 'IFF', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<--'), { op: 'IFF', replaceBefore: 3 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<–'), { op: 'IFF', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<='), { op: 'IFF', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P<'), { op: 'IFF', replaceBefore: 1 })
  assert.deepEqual(arrowShortcutBeforeCaret('P--'), { op: 'IFTHEN', replaceBefore: 2 })
  assert.deepEqual(arrowShortcutBeforeCaret('P='), { op: 'IFTHEN', replaceBefore: 1 })
  assert.deepEqual(arrowShortcutBeforeCaret('P-='), { op: 'IFTHEN', replaceBefore: 1 })
  assert.deepEqual(arrowShortcutBeforeCaret('a=b'), { op: 'IFTHEN', replaceBefore: 0 })
  assert.deepEqual(arrowShortcutBeforeCaret(''), { op: 'IFTHEN', replaceBefore: 0 })
})

for (const notation of ['calgary', 'hurley']) {
  const { IFF, IFTHEN, NOT, AND } = FormulaInput.attach({}, notation).symbols

  test(`${notation} turns every ascii biconditional into one connective`, () => {
    for (const typed of ['P<-', 'P<--', 'P<–', 'P<=', 'P<', 'P <-']) {
      assert.equal(press(typed, '>', notation).value, `P ${IFF} `, typed)
    }
    assert.equal(press('~(P<-', '>', notation).value, `~(P ${IFF} `)
  })

  test(`${notation} turns every ascii conditional into one connective`, () => {
    for (const typed of ['P-', 'P--', 'P–', 'P=', 'P']) {
      assert.equal(press(typed, '>', notation).value, `P ${IFTHEN} `, typed)
    }
    assert.equal(press('', '>', notation).value, ` ${IFTHEN} `)
  })

  test(`${notation} only consumes an arrow that touches the caret`, () => {
    assert.equal(press('P<Q-', '>', notation).value, `P<Q ${IFTHEN} `)
    assert.equal(press('a=b', '>', notation).value, `a=b ${IFTHEN} `)
    assert.equal(press('P-=', '>', notation).value, `P- ${IFTHEN} `)
  })

  test(`${notation} leaves ctrl and cmd chords to the browser but still reads altgr characters`, () => {
    assert.deepEqual(press('P', '.', notation, { ctrlKey: true }), { value: 'P', prevented: false })
    assert.deepEqual(press('P', '.', notation, { metaKey: true }), { value: 'P', prevented: false })
    assert.equal(press('P', '.', notation).value, `P ${AND} `)
    assert.equal(press('', '~', notation, { ctrlKey: true, altKey: true }).value, NOT)
  })
}
