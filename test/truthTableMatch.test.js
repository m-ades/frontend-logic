import test from 'node:test'
import assert from 'node:assert/strict'
import { fullTableMatch } from '../src/lib/logicpenguin/checkers/truth-tables.js'

test('matches boolean numeric and letter truth values in either table', () => {
  const trueValues = [true, 1, '1', 'T', 't']
  const falseValues = [false, 0, '0', 'F', 'f']
  for (const [index, value] of trueValues.entries()) {
    const rows = [[value, falseValues[index]]]
    assert.deepEqual(fullTableMatch([[true, false]], rows), {
      rowdiff: 0, offcells: [], numchecked: 2,
    })
    assert.deepEqual(fullTableMatch(rows, [[true, false]]), {
      rowdiff: 0, offcells: [], numchecked: 2,
    })
  }
})

test('reports unfinished and invalid cells as wrong', () => {
  assert.deepEqual(fullTableMatch(
    [[false, false, false, false, false, false]],
    [[-1, null, '', undefined, 'false', 'unknown']],
  ), {
    rowdiff: 0,
    offcells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
    numchecked: 6,
  })
})

test('reports a missing submission as missing rows', () => {
  assert.deepEqual(fullTableMatch([[true], [false]], undefined), {
    rowdiff: 2, offcells: [], numchecked: 0,
  })
})

test('reports missing rows and cells within a submitted table without throwing', () => {
  assert.deepEqual(fullTableMatch(
    [[true, false], [false, true]],
    [undefined, [false]],
  ), {
    rowdiff: 0, offcells: [[0, 0], [0, 1], [1, 1]], numchecked: 4,
  })
})

test('counts missing and extra rows while checking only overlapping cells', () => {
  assert.deepEqual(fullTableMatch([[true], [false]], [[true]]), {
    rowdiff: 1, offcells: [], numchecked: 1,
  })
  assert.deepEqual(fullTableMatch([[true]], [[true], [false]]), {
    rowdiff: -1, offcells: [], numchecked: 1,
  })
})

test('compares no cells when the answer table is empty or absent', () => {
  for (const answer of [[], undefined, [[]]]) {
    assert.deepEqual(fullTableMatch(answer, []), {
      rowdiff: 0, offcells: [], numchecked: 0,
    })
  }
})
