import test from 'node:test'
import assert from 'node:assert/strict'
import formulaTruthTable from '../src/lib/logicpenguin/checkers/formula-truth-table.js'

const answer = {
  rows: [[true, false], [false, true]],
  opspot: 1,
  taut: false,
  contra: false,
}

test('grades the table classification main operator and witness as four components', async () => {
  const result = await formulaTruthTable({}, answer, {
    right: { rows: answer.rows, colhls: [false, true] },
    rowhls: [false, true],
    mcans: ['contingent'],
  }, true, 1, false, {
    question: true, highlightMainOperator: true, highlightWitnessRow: true,
  })

  assert.deepEqual(result, {
    successstatus: 'correct', points: 1, componentScores: [1, 1, 1, 1],
  })
})

for (const [label, highlights] of [
  ['missing', undefined],
  ['wrong', [true, false]],
  ['multiple', [true, true]],
  ['out of range', [false, false, true]],
]) {
  test(`rejects ${label} highlights for each enabled formula component`, async () => {
    for (const option of ['highlightMainOperator', 'highlightWitnessRow']) {
      const result = await formulaTruthTable({}, answer, {
        right: { rows: answer.rows, colhls: highlights },
        rowhls: highlights,
      }, true, 1, false, { [option]: true })

      assert.deepEqual(result, {
        successstatus: 'partial', points: 0.5, componentScores: [1, 0],
      })
    }
  })
}

test('requires all enabled formula components when partial credit is disabled', async () => {
  const result = await formulaTruthTable({}, answer, {
    right: { rows: answer.rows },
    mcans: ['contingent'],
  }, false, 1, false, { question: true, highlightMainOperator: true })

  assert.deepEqual(result, {
    successstatus: 'incorrect', points: 0, componentScores: [0, 0, 0],
  })
})

test('does not require disabled highlights', async () => {
  const result = await formulaTruthTable({}, answer, {
    right: { rows: answer.rows },
  }, false, 1.5, false, {})

  assert.deepEqual(result, {
    successstatus: 'correct', points: 1.5, componentScores: [1],
  })
})

test('keeps classification credit for reasoning correctly from a wrong formula table', async () => {
  const result = await formulaTruthTable({}, answer, {
    right: { rows: [[true, true], [false, true]] },
    mcans: ['tautology'],
  }, true, 1, true, { question: true })

  assert.equal(result.successstatus, 'partial')
  assert.equal(result.points, 0.5)
  assert.deepEqual(result.componentScores, [0, 1])
  assert.deepEqual(result.offcells, [[0, 1]])
  assert.equal(result.qright, true)
})

test('rejects missing formula tables without throwing', async () => {
  for (const submission of [undefined, {}, { right: {} }]) {
    const result = await formulaTruthTable({}, answer, submission, false, 1, false, {})
    assert.deepEqual(result, {
      successstatus: 'incorrect', points: 0, componentScores: [0],
    })
  }
})
