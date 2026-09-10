import test from 'node:test'
import assert from 'node:assert/strict'
import argumentTruthTable from '../src/lib/logicpenguin/checkers/argument-truth-table.js'

const answer = {
  valid: false,
  prems: [{ opspot: 0, rows: [[true], [true], [false], [false]] }],
  conc: { opspot: 0, rows: [[true], [false], [true], [false]] },
}

test('accepts a row with true premises and a false conclusion', async () => {
  const result = await argumentTruthTable({}, answer, {
    lefts: answer.prems, right: answer.conc,
    mcans: ['invalid'], rowhls: [false, true, false, false],
  }, true, 1, false, { question: true, highlightWitnessRow: true })

  assert.deepEqual(result, {
    successstatus: 'correct', points: 1, componentScores: [1, 1, 1],
  })
})

for (const [label, rowhls] of [
  ['missing', undefined],
  ['wrong', [true, false, false, false]],
  ['multiple', [true, true, false, false]],
  ['out of range', [false, false, false, false, true]],
]) {
  test(`withholds only witness credit for a ${label} argument highlight`, async () => {
    const result = await argumentTruthTable({}, answer, {
      lefts: answer.prems, right: answer.conc, mcans: ['invalid'], rowhls,
    }, true, 1, false, { question: true, highlightWitnessRow: true })

    assert.deepEqual(result, {
      successstatus: 'partial', points: 2 / 3, componentScores: [1, 1, 0],
    })
  })
}

test('requires a witness when enabled without partial credit', async () => {
  const result = await argumentTruthTable({}, answer, {
    lefts: answer.prems, right: answer.conc,
  }, false, 1, false, { highlightWitnessRow: true })

  assert.deepEqual(result, {
    successstatus: 'incorrect', points: 0, componentScores: [0, 0],
  })
})

test('does not require a witness when disabled', async () => {
  const result = await argumentTruthTable({}, answer, {
    lefts: answer.prems, right: answer.conc,
  }, false, 1, false, {})

  assert.deepEqual(result, {
    successstatus: 'correct', points: 1, componentScores: [1],
  })
})

test('rejects missing or extra premise rows while preserving correct classification credit', async () => {
  for (const rows of [answer.prems[0].rows.slice(0, -1), [...answer.prems[0].rows, [true]]]) {
    const result = await argumentTruthTable({}, answer, {
      lefts: [{ rows }], right: answer.conc, mcans: ['invalid'],
    }, true, 1, false, { question: true })

    assert.deepEqual(result, {
      successstatus: 'partial', points: 0.5, componentScores: [0, 1],
    })
  }
})

test('does not infer a classification from a premise with missing rows', async () => {
  const result = await argumentTruthTable({}, answer, {
    lefts: [{ rows: [[true]] }], right: answer.conc, mcans: ['valid'],
  }, true, 1, false, { question: true })

  assert.deepEqual(result, {
    successstatus: 'incorrect', points: 0, componentScores: [0, 0],
  })
})

test('keeps classification credit for reasoning correctly from a wrong argument table', async () => {
  const result = await argumentTruthTable({}, answer, {
    lefts: answer.prems,
    right: { rows: [[true], [true], [true], [false]] },
    mcans: ['valid'],
  }, true, 1, true, { question: true })

  assert.equal(result.successstatus, 'partial')
  assert.equal(result.points, 0.5)
  assert.deepEqual(result.componentScores, [0, 1])
  assert.deepEqual(result.offcells.conc, [[1, 0]])
  assert.equal(result.qright, true)
})

test('rejects missing argument tables without throwing', async () => {
  for (const submission of [undefined, {}, { lefts: [], right: answer.conc }]) {
    const result = await argumentTruthTable({}, answer, submission, false, 1, false, {})
    assert.deepEqual(result, {
      successstatus: 'incorrect', points: 0, componentScores: [0],
    })
  }
})
