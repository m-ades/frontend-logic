import test from 'node:test'
import assert from 'node:assert/strict'
import equivalenceTruthTable from '../src/lib/logicpenguin/checkers/equivalence-truth-table.js'

const a = { opspot: 0, rows: [[true], [true], [false], [false]] }
const b = { opspot: 0, rows: [[true], [false], [true], [false]] }
const notA = { opspot: 0, rows: [[false], [false], [true], [true]] }
const conjunction = { opspot: 0, rows: [[true], [false], [false], [false]] }

for (const [label, answer, mcans] of [
  ['consistent triple', { tables: [a, b, conjunction] }, ['consistent']],
  ['inconsistent triple', { tables: [a, b, notA] }, ['inconsistent']],
  ['equivalent pair', { tables: [a, a] }, ['equivalent', 'consistent']],
  ['identical triple', { tables: [a, a, a] }, ['consistent']],
  ['legacy contradictory pair', { A: a, B: notA }, ['inconsistent']],
]) {
  test(`accepts the current classification for a ${label}`, async () => {
    const tables = answer.tables ?? [answer.A, answer.B]
    const result = await equivalenceTruthTable({}, answer, {
      lefts: tables.slice(0, -1), right: tables.at(-1), mcans,
    }, false, 1, false, { question: true })

    assert.deepEqual(result, {
      successstatus: 'correct', points: 1, componentScores: [1, 1],
    })
  })
}

test('normalizes truth values when classifying a pair', async () => {
  const result = await equivalenceTruthTable({}, {
    A: { opspot: 0, rows: [['T'], ['F']] },
    B: { opspot: 0, rows: [[1], [0]] },
  }, {
    lefts: [{ rows: [[true], [false]] }],
    right: { rows: [[true], [false]] },
    mcans: ['equivalent', 'consistent'],
  }, false, 1, false, { question: true })

  assert.equal(result.successstatus, 'correct')
})

test('requires every expected table and its full row count', async () => {
  for (const tables of [
    [a, b],
    [a, b, { rows: conjunction.rows.slice(0, -1) }],
    [a, b, conjunction, a],
  ]) {
    const result = await equivalenceTruthTable({}, { tables: [a, b, conjunction] }, {
      lefts: tables.slice(0, -1), right: tables.at(-1),
    }, false, 1, false, {})

    assert.equal(result.successstatus, 'incorrect')
    assert.equal(result.points, 0)
  }
})

test('accepts a single jointly satisfying witness for three tables', async () => {
  const result = await equivalenceTruthTable({}, { tables: [a, b, conjunction] }, {
    lefts: [a, b], right: conjunction, rowhls: [true, false, false, false],
  }, false, 1, false, { highlightWitnessRow: true })

  assert.deepEqual(result, {
    successstatus: 'correct', points: 1, componentScores: [1, 1],
  })
})

for (const [label, rowhls] of [
  ['missing', undefined],
  ['wrong', [false, true, false, false]],
  ['multiple', [true, true, false, false]],
  ['out of range', [false, false, false, false, true]],
]) {
  test(`withholds witness credit for ${label} highlights in a table set`, async () => {
    const result = await equivalenceTruthTable({}, { tables: [a, b, conjunction] }, {
      lefts: [a, b], right: conjunction, rowhls, mcans: ['consistent'],
    }, true, 1, false, { question: true, highlightWitnessRow: true })

    assert.deepEqual(result, {
      successstatus: 'partial', points: 2 / 3, componentScores: [1, 1, 0],
    })
  })
}

test('gives no credit for a missing witness when partial credit is disabled', async () => {
  const result = await equivalenceTruthTable({}, { tables: [a, b] }, {
    lefts: [a], right: b,
  }, false, 1, false, { highlightWitnessRow: true })

  assert.deepEqual(result, {
    successstatus: 'incorrect', points: 0, componentScores: [0, 0],
  })
})

test('checks witnesses against the answer key even when the submitted row makes every sentence true', async () => {
  const result = await equivalenceTruthTable({}, { tables: [a, b] }, {
    lefts: [a], right: a, rowhls: [false, true, false, false],
  }, true, 1, false, { highlightWitnessRow: true })

  assert.deepEqual(result, {
    successstatus: 'incorrect', points: 0, componentScores: [0, 0],
  })
})

test('keeps classification credit for reasoning correctly from wrong tables', async () => {
  const result = await equivalenceTruthTable({}, { A: a, B: notA }, {
    lefts: [a], right: a, mcans: ['equivalent', 'consistent'],
  }, true, 1, true, { question: true })

  assert.equal(result.successstatus, 'partial')
  assert.equal(result.points, 0.5)
  assert.deepEqual(result.componentScores, [0, 1])
  assert.equal(result.qright, true)
  assert.deepEqual(result.offcells.tables, [[], [[0, 0], [1, 0], [2, 0], [3, 0]]])
  assert.deepEqual(result.offcells.A, result.offcells.tables[0])
  assert.deepEqual(result.offcells.B, result.offcells.tables[1])
})

test('does not infer a classification from unknown main operator cells', async () => {
  const result = await equivalenceTruthTable({}, { A: a, B: notA }, {
    lefts: [a], right: { rows: [[-1], [true], [false], [false]] },
    mcans: ['equivalent', 'consistent'],
  }, true, 1, false, { question: true })

  assert.deepEqual(result, {
    successstatus: 'incorrect', points: 0, componentScores: [0, 0],
  })
})

test('rejects a missing submission without throwing', async () => {
  const result = await equivalenceTruthTable({}, { tables: [a, b] }, undefined,
    false, 1, false, { question: true, highlightWitnessRow: true })

  assert.deepEqual(result, {
    successstatus: 'incorrect', points: 0, componentScores: [0, 0, 0],
  })
})
