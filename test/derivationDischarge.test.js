import test from 'node:test'
import assert from 'node:assert/strict'
import derivationCalgary from '@logic-app/logic-engine/checkers/derivation-calgary.js'
import {
  buildSubmission,
  extractLines,
  getFitchScopeInfo,
  getOpenAssumptionDepths,
  FITCH_ASSUMPTION_RULES,
} from '../src/components/problems/derivation/derivationUtils.js'

const getDischargeStatus = (lines, rules) => getFitchScopeInfo(lines, rules).dischargedByLine

const id = (v) => v
const premises = ['(C ∧ D) ∨ E']
const conclusion = 'E ∨ D'

test('discharging belongs on the line that exits the box, not the last line still inside it', () => {
  const lines = [
    { formula: 'P', justification: 'AS' },
    { formula: 'P', justification: 'R 1' },
    { formula: 'P → P', justification: '→I 1-2' },
  ]
  // the assumption line has nothing open yet to discharge; every line after it does
  assert.deepEqual(getFitchScopeInfo(lines, FITCH_ASSUMPTION_RULES).eligibleByLine, [false, true, true])

  // discharging on line 2 (still inside the box) closes the box one line early instead of at the citation
  const dischargedOnLastInsideLine = lines.map((line, index) => (
    index === 1 ? { ...line, dischargesScope: true } : line
  ))
  assert.deepEqual(getOpenAssumptionDepths(dischargedOnLastInsideLine, {
    mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES,
  }), [1, 0, 0])

  // discharging on line 3 - the line that actually exits, matching the ->I citation - is correct
  const dischargedOnExitLine = lines.map((line, index) => (
    index === 2 ? { ...line, dischargesScope: true } : line
  ))
  assert.deepEqual(getOpenAssumptionDepths(dischargedOnExitLine, {
    mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES,
  }), [1, 1, 0])
  assert.deepEqual(getDischargeStatus(dischargedOnExitLine, FITCH_ASSUMPTION_RULES), [false, false, true])
})

// sibling branches before the closing citation is written
const branchLines = [
  { formula: '(C ∧ D) ∨ E', justification: '', readOnly: true },
  { formula: 'E', justification: 'AS' },
  { formula: 'E ∨ D', justification: '∨I 2' },
  { formula: 'C ∧ D', justification: 'AS' },
  { formula: 'D', justification: '∧E 4' },
  { formula: 'E ∨ D', justification: '∨I 5' },
]

test('assumptions stay nested until discharged or cited as separate ranges', () => {
  const depths = getOpenAssumptionDepths(branchLines, {
    mode: 'nested',
    assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  assert.deepEqual(depths, [0, 1, 1, 2, 2, 2])
})

test('discharging the first branch makes the second branch its sibling immediately, before any closing citation exists', () => {
  // the discharge marker goes on the line that leaves branch 1 - branch 2's own assumption line
  const dischargedLines = branchLines.map((line, index) => (
    index === 3 ? { ...line, dischargesScope: true } : line
  ))
  const depths = getOpenAssumptionDepths(dischargedLines, {
    mode: 'nested',
    assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  assert.deepEqual(depths, [0, 1, 1, 1, 1, 1])

  const submission = buildSubmission(dischargedLines, conclusion, premises, id, id, {
    nestedSubderivations: true,
    assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  const parts = submission.ans.parts[0].parts
  assert.equal(parts.length, 3)
  assert.equal(parts[0].n, '1')
  assert.ok(Array.isArray(parts[1].parts))
  assert.ok(Array.isArray(parts[2].parts))
})

test('saving and restoring unfinished sibling branches preserves discharge and nesting', () => {
  const lines = branchLines.map((line, index) => (
    index === 3 ? { ...line, dischargesScope: true } : line
  ))
  const options = { nestedSubderivations: true, assumptionRules: FITCH_ASSUMPTION_RULES }
  const submission = buildSubmission(lines, conclusion, premises, id, id, options)
  const restored = extractLines(JSON.parse(JSON.stringify(submission)), premises)

  assert.equal(restored[3].dischargesScope, true)
  assert.deepEqual(getOpenAssumptionDepths(restored, {
    mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES,
  }), [0, 1, 1, 1, 1, 1])
  assert.deepEqual(buildSubmission(restored, conclusion, premises, id, id, options), submission)

  restored[3].dischargesScope = false
  assert.deepEqual(getOpenAssumptionDepths(restored, {
    mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES,
  }), [0, 1, 1, 2, 2, 2])
})

test('a conflicting citation cannot extend a manually discharged assumption', async () => {
  const lines = [
    { formula: 'P', justification: 'AS' },
    { formula: 'P', justification: 'R 1' },
    { formula: 'P', justification: 'R 1', dischargesScope: true },
    { formula: 'P → P', justification: '→I 1-3' },
  ]
  assert.deepEqual(getOpenAssumptionDepths(lines, {
    mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES,
  }), [1, 1, 0, 0])
  const submission = buildSubmission(lines, 'P → P', [], id, id, {
    nestedSubderivations: true, assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  assert.equal(submission.ans.parts[0].parts[0].parts.length, 2)
  const result = await derivationCalgary(
    { prems: [], conc: 'P → P' }, null, submission.ans, false, true, { notation: 'calgary' }
  )
  assert.equal(result.successstatus, 'incorrect')
})

test('a single line assumption only closes once it is explicitly discharged, never from its citation alone', async () => {
  const lines = [
    { formula: 'P', justification: 'AS' },
    { formula: 'P → P', justification: '→I 1-1' },
  ]
  // no discharge marker: the box never closes, so the citation can't line up with it
  assert.deepEqual(getOpenAssumptionDepths(lines, {
    mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES,
  }), [1, 1])
  const undischarged = buildSubmission(lines, 'P → P', [], id, id, {
    nestedSubderivations: true, assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  const undischargedResult = await derivationCalgary(
    { prems: [], conc: 'P → P' }, null, undischarged.ans, false, true, { notation: 'calgary' }
  )
  assert.equal(undischargedResult.successstatus, 'incorrect')
  assert.ok(undischargedResult.errors?.['2']?.justification)

  // discharging on line 2 - the line that exits - closes the (single-line) box at line 1
  const discharged = lines.map((line, index) => (index === 1 ? { ...line, dischargesScope: true } : line))
  assert.deepEqual(getOpenAssumptionDepths(discharged, {
    mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES,
  }), [1, 0])
  const submission = buildSubmission(discharged, 'P → P', [], id, id, {
    nestedSubderivations: true, assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  const result = await derivationCalgary(
    { prems: [], conc: 'P → P' }, null, submission.ans, false, true, { notation: 'calgary' }
  )
  assert.deepEqual(result.errors, {})
  assert.equal(result.successstatus, 'correct')
})

test('discharge markers without assumptions do not create scopes', () => {
  assert.deepEqual(getOpenAssumptionDepths([
    { justification: 'Pr' },
    { justification: 'R 1', dischargesScope: true },
    { justification: '' },
  ], { mode: 'nested', assumptionRules: FITCH_ASSUMPTION_RULES }), [0, 0, 0])
})

test('a completed vE proof checks out end to end via the real checker only once both branches are discharged', async () => {
  const dischargedLines = [
    // branch 1 is discharged by branch 2's own assumption line; branch 2 is discharged by the vE line itself
    ...branchLines.map((line, index) => (
      index === 3 ? { ...line, dischargesScope: true } : line
    )),
    { formula: 'E ∨ D', justification: '∨E 1, 2-3, 4-6', dischargesScope: true },
  ]
  const submission = buildSubmission(dischargedLines, conclusion, premises, id, id, {
    nestedSubderivations: true,
    assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  const result = await derivationCalgary(
    { prems: premises, conc: conclusion },
    null,
    submission.ans,
    false,
    true,
    { notation: 'calgary' }
  )
  assert.deepEqual(result.errors, {})
  assert.equal(result.successstatus, 'correct')

  // leaving both branches undischarged reports a deterministic error instead of quietly passing
  const undischargedLines = [
    ...branchLines,
    { formula: 'E ∨ D', justification: '∨E 1, 2-3, 4-6' },
  ]
  const undischargedSubmission = buildSubmission(undischargedLines, conclusion, premises, id, id, {
    nestedSubderivations: true,
    assumptionRules: FITCH_ASSUMPTION_RULES,
  })
  const undischargedResult = await derivationCalgary(
    { prems: premises, conc: conclusion },
    null,
    undischargedSubmission.ans,
    false,
    true,
    { notation: 'calgary' }
  )
  assert.equal(undischargedResult.successstatus, 'incorrect')
  assert.ok(undischargedResult.errors?.['7']?.justification)
})

test('discharge status is only ever set by the student\'s own toggle, never inferred from a citation', () => {
  const opts = FITCH_ASSUMPTION_RULES

  // a valid closing citation with no discharge toggle leaves the scope open
  assert.deepEqual(getDischargeStatus([
    { formula: 'P', justification: 'AS' },
    { formula: 'P', justification: 'R 1' },
    { formula: 'P → P', justification: '→I 1-2' },
  ], opts), [false, false, false])

  // the manual toggle is what closes the scope, regardless of any citation
  assert.deepEqual(getDischargeStatus([
    { formula: 'P', justification: 'AS' },
    { formula: 'P', justification: 'R 1', dischargesScope: true },
  ], opts), [false, true])

  assert.deepEqual(getDischargeStatus([
    { formula: 'P', justification: 'AS' },
    { formula: 'P', justification: 'R 1', dischargesScope: true },
    { formula: 'P → P', justification: '→I 1-2' },
  ], opts), [false, true, false])

  // a still-open box force-closed at the end of the array (for depth display) is not a real discharge
  assert.deepEqual(getDischargeStatus([
    { formula: 'P', justification: 'AS' },
    { formula: 'P', justification: 'R 1' },
  ], opts), [false, false])
})
