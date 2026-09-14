import test from 'node:test'
import assert from 'node:assert/strict'
import getFormulaClass from '@logic-app/logic-engine/symbolic/formula.js'

for (const notation of ['calgary', 'hurley']) {
  test(`${notation} parses variation selectors as presentation only`, () => {
    const Formula = getFormulaClass(notation)
    const plain = Formula.from('A ↔ B')
    for (const selector of ['\uFE0E', '\uFE0F']) {
      const decorated = Formula.from(`A ↔${selector} B`)
      assert.equal(decorated.wellformed, true)
      assert.equal(decorated.normal, plain.normal)
      assert.equal(decorated, plain)
      assert.equal(Formula.from(`A ↔${selector} B @`).wellformed, false)
    }
  })
}
