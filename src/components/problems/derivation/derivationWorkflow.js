import { getDerivationCheckerForLogicSystem } from '../../../lib/logicpenguin/checkers/derivation-by-logic-system.js'
import { fetchJson, getActiveUserId } from '../../../utils/api.js'
import { getSubmissionScore } from '../../../utils/problemHelpers.js'
import {
  ASSUMPTION_RULES,
  buildErrorRows,
  buildSubmission,
  formulasEqualNormally,
  getOpenAssumptionDepths,
  getJustificationMeta,
  getRuleFromJustification,
  isResolvedConclusionLine,
} from './derivationUtils.js'

export async function runDerivationAutoCheck({
  isLineCompleteForCheck,
  linesSnapshot,
  normalizeFormulaForCheck,
  normalizeJustificationForCheck,
  premises,
  proof,
  logicSystem,
}) {
  const checkDerivation = getDerivationCheckerForLogicSystem(logicSystem)
  const submission = buildSubmission(
    linesSnapshot,
    proof?.conclusion,
    premises,
    normalizeFormulaForCheck,
    normalizeJustificationForCheck
  )
  const result = await checkDerivation(
    { prems: premises, conc: proof?.conclusion, ruleset: proof?.ruleset },
    null,
    submission.ans,
    false,
    -1,
    true,
    proof?.options
  )
  const normalizedConclusion = normalizeFormulaForCheck(proof?.conclusion || '')
  const errors = result?.errors || {}
  const isLineComplete = (index) => {
    if (index < premises.length) return true
    return isLineCompleteForCheck(linesSnapshot[index] || {})
  }
  const filledLineIndices = linesSnapshot
    .map((line, index) => ({
      index,
      hasContent: Boolean((line?.formula || '').trim() || (line?.justification || '').trim()),
    }))
    .filter((entry) => entry.index >= premises.length && entry.hasContent)
    .map((entry) => entry.index)
  const lastFilledIndex = filledLineIndices.length ? filledLineIndices[filledLineIndices.length - 1] : -1
  const lastFilled = lastFilledIndex >= 0 ? linesSnapshot[lastFilledIndex] : null
  const allFilledComplete = filledLineIndices.every((index) => isLineComplete(index))
  const openAssumptionDepths = getOpenAssumptionDepths(linesSnapshot)
  const lastFilledResolvesConclusion = isResolvedConclusionLine({
    line: lastFilled,
    index: lastFilledIndex,
    conclusion: proof?.conclusion,
    normalizeFormula: normalizeFormulaForCheck,
    openAssumptionDepths,
  })
  const readyForRuleGate = Boolean(
    normalizedConclusion &&
    lastFilled &&
    isLineCompleteForCheck(lastFilled) &&
    lastFilledResolvesConclusion &&
    allFilledComplete
  )
  const filteredErrors = {}
  Object.keys(errors).forEach((lineNumber) => {
    const categories = errors[lineNumber] || {}
    let lineRule = ''
    let isAssumptionLine = false
    if (lineNumber !== '??') {
      const index = Number(lineNumber) - 1
      if (Number.isFinite(index)) {
        lineRule = getRuleFromJustification(linesSnapshot[index]?.justification || '').toUpperCase()
        isAssumptionLine = ASSUMPTION_RULES.has(lineRule)
        if (!isLineComplete(index) && !isAssumptionLine && lineRule !== 'CP' && lineRule !== 'IP') {
          return
        }
      }
    }
    const nextCategories = {}
    Object.keys(categories).forEach((category) => {
      if (lineNumber === '??' && category === 'rule' && !readyForRuleGate) return
      if (category === 'completion' && !readyForRuleGate) return
      nextCategories[category] = categories[category]
    })
    if (Object.keys(nextCategories).length > 0) {
      filteredErrors[lineNumber] = nextCategories
    }
  })
  const perLine = {}
  linesSnapshot.forEach((line, index) => {
    if (index < premises.length) {
      perLine[index] = null
      return
    }
    const lineNumber = String(index + 1)
    const formulaFilled = Boolean((line?.formula || '').trim())
    const lineRule = getRuleFromJustification(line?.justification || '').toUpperCase()
    const lineErrors = filteredErrors[lineNumber] || {}
    if (!formulaFilled) {
      perLine[index] = ASSUMPTION_RULES.has(lineRule) && Object.keys(lineErrors).length > 0 ? 'error' : null
      return
    }
    const { hasRule } = getJustificationMeta(line.justification)
    if (!hasRule) {
      perLine[index] = null
      return
    }
    const blockingCategories = Object.keys(lineErrors).filter((category) => category !== 'dependency')
    perLine[index] = blockingCategories.length > 0 ? 'error' : 'ok'
  })
  const rows = buildErrorRows(filteredErrors, linesSnapshot, { skipCompletion: false })
  const lastIndex = linesSnapshot.length - 1
  const last = linesSnapshot[lastIndex]
  const shouldAutoAdd = Boolean(
    normalizedConclusion &&
    last &&
    !last.readOnly &&
    isLineCompleteForCheck(last) &&
    perLine[lastIndex] === 'ok' &&
    !isResolvedConclusionLine({
      line: last,
      index: lastIndex,
      conclusion: proof?.conclusion,
      normalizeFormula: normalizeFormulaForCheck,
      openAssumptionDepths,
    })
  )
  return { perLine, rows, shouldAutoAdd }
}

export function deriveDerivationLooksGood({
  autoCheckEnabled,
  autoCheckPerLine,
  isLineCompleteForCheck,
  lines,
  normalizeFormulaForCheck,
  premises,
  proof,
}) {
  if (!autoCheckEnabled) return { ok: false, index: null }
  const conclusion = proof?.conclusion || ''
  if (!String(conclusion).trim()) return { ok: false, index: null }
  const filledEditableIndices = lines
    .map((line, index) => ({
      index,
      hasContent: index >= premises.length && Boolean((line?.formula || '').trim() || (line?.justification || '').trim()),
    }))
    .filter((entry) => entry.hasContent)
    .map((entry) => entry.index)
  if (filledEditableIndices.length === 0) return { ok: false, index: null }
  const lastFilledIndex = filledEditableIndices[filledEditableIndices.length - 1]
  const lastFilled = lines[lastFilledIndex]
  if (!lastFilled || lastFilled.readOnly) return { ok: false, index: null }
  if (!isLineCompleteForCheck(lastFilled)) return { ok: false, index: null }
  if (autoCheckPerLine[lastFilledIndex] !== 'ok') return { ok: false, index: null }
  const openAssumptionDepths = getOpenAssumptionDepths(lines)
  if (!isResolvedConclusionLine({
    line: lastFilled,
    index: lastFilledIndex,
    conclusion,
    normalizeFormula: normalizeFormulaForCheck,
    openAssumptionDepths,
  })) return { ok: false, index: null }
  return { ok: true, index: lastFilledIndex }
}

export async function submitDerivationAnswer({
  lines,
  normalizeFormulaForCheck,
  normalizeJustificationForCheck,
  onAttempt,
  onProofComplete,
  premises,
  proof,
  setAttemptCount,
  setAttemptLimit,
  setLastSubmitStatus,
  setStatusBanner,
}) {
  const submissionData = buildSubmission(
    lines,
    proof?.conclusion,
    premises,
    normalizeFormulaForCheck,
    normalizeJustificationForCheck
  )
  const response = await fetchJson('/api/validate/submission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignment_question_id: proof?.questionId,
      user_id: getActiveUserId(),
      submission_data: submissionData,
    }),
  })
  const validation = response?.validation || {}
  const successStatus = validation.successstatus || 'incorrect'
  setLastSubmitStatus(successStatus)
  if (typeof response?.attempt_limit === 'number') {
    setAttemptLimit(response.attempt_limit)
  }
  setAttemptCount((prev) => response?.submission?.attempt ?? prev + 1)
  if (typeof window !== 'undefined') {
    const score = getSubmissionScore(response)
    window.dispatchEvent(new CustomEvent('assignment-submission', {
      detail: {
        assignmentQuestionId: proof?.questionId,
        attempt: response?.submission?.attempt,
        attemptLimit: response?.attempt_limit,
        isCorrect: successStatus === 'correct',
        score,
      },
    }))
  }
  setStatusBanner({
    status: successStatus,
    message: validation.message || validation.transmessage || (successStatus === 'correct' ? 'Correct!' : 'Incorrect.'),
  })
  onAttempt?.({
    attempt: response?.submission?.attempt,
    attemptLimit: response?.attempt_limit,
  })
  if (successStatus === 'correct') {
    onProofComplete?.(proof.id)
  }
}
