import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  INDENT_END_RULES,
  buildErrorRows,
  buildSubmission,
  getJustificationMeta,
  getOpenAssumptionDepths,
  getRuleFromJustification,
  isResolvedConclusionLine,
} from './derivationUtils.js'
import { AUTO_CHECK_STORAGE_KEY } from './derivationTableConfig.js'

const EMPTY_AUTO_CHECK = { perLine: {}, rows: [] }
const EMPTY_NOTICE = { index: null, message: '', tone: 'error' }
const REQUIRED_ASSUMPTION_MESSAGE = 'must use AS because this line begins an assumption scope'

const getEffectiveAssumptionDepths = (lines, usesNestedSubderivations, assumptionRules) => {
  const inferred = getOpenAssumptionDepths(lines, {
    mode: usesNestedSubderivations ? 'nested' : 'flat',
    assumptionRules,
  })
  return lines.map((line, index) => (
    Number.isInteger(line.scopeDepth) ? line.scopeDepth : inferred[index]
  ))
}

export default function useDerivationAutoCheck({
  activeAssumptionRules,
  checkDerivation,
  isLineComplete,
  lines,
  normalizeFormula,
  normalizeJustification,
  notation,
  pendingFocusRef,
  premises,
  proof,
  setLines,
  usesNestedSubderivations,
}) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = window.sessionStorage.getItem(AUTO_CHECK_STORAGE_KEY)
    return saved === null ? true : saved === 'true'
  })
  const [state, setState] = useState(EMPTY_AUTO_CHECK)
  const [notice, setNotice] = useState(EMPTY_NOTICE)
  const timerRef = useRef(null)
  const clearNotice = useCallback(() => setNotice(EMPTY_NOTICE), [])
  const showError = useCallback((index, message) => {
    setNotice({ index, message, tone: 'error' })
  }, [])

  const runCheck = useCallback(async (linesSnapshot) => {
    const submission = buildSubmission(
      linesSnapshot,
      proof?.conclusion,
      premises,
      normalizeFormula,
      normalizeJustification,
      { nestedSubderivations: usesNestedSubderivations, assumptionRules: activeAssumptionRules }
    )
    const result = await checkDerivation(
      { prems: premises, conc: proof?.conclusion, ruleset: proof?.ruleset },
      submission.ans,
      -1,
      { ...(proof?.options || {}), notation }
    )
    const normalizedConclusion = normalizeFormula(proof?.conclusion || '')
    const errors = result?.errors || {}
    const lineIsComplete = (index) => index < premises.length || isLineComplete(linesSnapshot[index] || {})
    const filledIndices = linesSnapshot
      .map((line, index) => ({
        index,
        hasContent: Boolean((line?.formula || '').trim() || (line?.justification || '').trim()),
      }))
      .filter(({ index, hasContent }) => index >= premises.length && hasContent)
      .map(({ index }) => index)
    const lastFilledIndex = filledIndices.at(-1) ?? -1
    const lastFilled = linesSnapshot[lastFilledIndex]
    const openAssumptionDepths = getEffectiveAssumptionDepths(
      linesSnapshot,
      usesNestedSubderivations,
      activeAssumptionRules
    )
    const lastFilledResolvesConclusion = isResolvedConclusionLine({
      line: lastFilled,
      index: lastFilledIndex,
      conclusion: proof?.conclusion,
      normalizeFormula,
      notation,
      openAssumptionDepths,
    })
    const readyForRuleGate = Boolean(
      normalizedConclusion
      && lastFilled
      && isLineComplete(lastFilled)
      && lastFilledResolvesConclusion
      && filledIndices.every(lineIsComplete)
    )
    const filteredErrors = {}

    Object.entries(errors).forEach(([lineNumber, categories]) => {
      let rule = ''
      let isAssumption = false
      if (lineNumber !== '??') {
        const index = Number(lineNumber) - 1
        if (Number.isFinite(index)) {
          const line = linesSnapshot[index]
          rule = getRuleFromJustification(line?.justification || '').toUpperCase()
          isAssumption = activeAssumptionRules.has(rule)
          const fixedRuleEntered = line?.formulaReadOnly
            && getJustificationMeta(line.justification).hasRule
          if (!lineIsComplete(index) && !isAssumption && !fixedRuleEntered) {
            if (usesNestedSubderivations || !INDENT_END_RULES.has(rule)) return
          }
        }
      }

      const visibleCategories = Object.fromEntries(
        Object.entries(categories || {}).filter(([category]) => {
          if (lineNumber === '??' && category === 'rule' && !readyForRuleGate) return false
          return category !== 'completion' || readyForRuleGate
        })
      )
      if (Object.keys(visibleCategories).length > 0) {
        filteredErrors[lineNumber] = visibleCategories
      }
    })

    linesSnapshot.forEach((line, index) => {
      const rule = getRuleFromJustification(line?.justification || '').toUpperCase()
      if (!line?.startsSubproof || !rule || activeAssumptionRules.has(rule)) return
      const lineNumber = String(index + 1)
      const existing = filteredErrors[lineNumber] || {}
      filteredErrors[lineNumber] = {
        ...existing,
        rule: {
          ...(existing.rule || {}),
          high: {
            ...(existing.rule?.high || {}),
            [REQUIRED_ASSUMPTION_MESSAGE]: 1,
          },
        },
      }
    })

    const perLine = {}
    linesSnapshot.forEach((line, index) => {
      if (index < premises.length) {
        perLine[index] = null
        return
      }
      const rule = getRuleFromJustification(line?.justification || '').toUpperCase()
      const lineErrors = filteredErrors[String(index + 1)] || {}
      if (!(line?.formula || '').trim()) {
        perLine[index] = activeAssumptionRules.has(rule) && Object.keys(lineErrors).length > 0
          ? 'error'
          : null
        return
      }
      const { hasRule } = getJustificationMeta(line.justification)
      if (line.startsSubproof && hasRule && !activeAssumptionRules.has(rule)) {
        perLine[index] = 'error'
        return
      }
      if (!hasRule) {
        perLine[index] = null
        return
      }
      const hasError = Object.keys(lineErrors).some((category) => category !== 'dependency')
      if (line.formulaReadOnly && hasError) {
        perLine[index] = 'error'
        return
      }
      if (!isLineComplete(line)) {
        perLine[index] = null
        return
      }
      perLine[index] = hasError ? 'error' : 'ok'
    })

    const lastIndex = linesSnapshot.length - 1
    const last = linesSnapshot[lastIndex]
    const shouldAutoAdd = Boolean(
      normalizedConclusion
      && last
      && !last.readOnly
      && isLineComplete(last)
      && perLine[lastIndex] === 'ok'
      && !isResolvedConclusionLine({
        line: last,
        index: lastIndex,
        conclusion: proof?.conclusion,
        normalizeFormula,
        notation,
        openAssumptionDepths,
      })
    )

    return {
      perLine,
      rows: buildErrorRows(filteredErrors, linesSnapshot, { skipCompletion: false }),
      shouldAutoAdd,
    }
  }, [
    activeAssumptionRules,
    checkDerivation,
    isLineComplete,
    normalizeFormula,
    normalizeJustification,
    notation,
    premises,
    proof?.conclusion,
    proof?.options,
    proof?.ruleset,
    usesNestedSubderivations,
  ])

  useEffect(() => {
    if (!enabled) {
      setState(EMPTY_AUTO_CHECK)
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const result = await runCheck(lines)
        setState({ perLine: result.perLine, rows: result.rows })
        if (!result.shouldAutoAdd) return
        setLines((previous) => {
          if (previous.length !== lines.length) return previous
          const last = previous.at(-1)
          if (!last || last.readOnly || !isLineComplete(last) || !proof?.conclusion) return previous
          const openAssumptionDepths = getEffectiveAssumptionDepths(
            previous,
            usesNestedSubderivations,
            activeAssumptionRules
          )
          if (isResolvedConclusionLine({
            line: last,
            index: previous.length - 1,
            conclusion: proof.conclusion,
            normalizeFormula,
            notation,
            openAssumptionDepths,
          })) return previous
          pendingFocusRef.current = previous.length
          return [...previous, { formula: '', justification: '', readOnly: false }]
        })
      } catch {
        setState({
          perLine: {},
          rows: [{
            line: '',
            entries: [{ label: 'Autocheck', messages: ['Autocheck failed.'], isWarning: true }],
          }],
        })
      }
    }, 250)
    return () => clearTimeout(timerRef.current)
  }, [
    activeAssumptionRules,
    enabled,
    isLineComplete,
    lines,
    normalizeFormula,
    notation,
    pendingFocusRef,
    proof?.conclusion,
    runCheck,
    setLines,
    usesNestedSubderivations,
  ])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(AUTO_CHECK_STORAGE_KEY, String(enabled))
    }
  }, [enabled])

  const looksGood = useMemo(() => {
    if (!enabled || !String(proof?.conclusion || '').trim()) return { ok: false, index: null }
    const lastFilledIndex = lines
      .map((line, index) => ({
        index,
        hasContent: index >= premises.length
          && Boolean((line?.formula || '').trim() || (line?.justification || '').trim()),
      }))
      .filter(({ hasContent }) => hasContent)
      .at(-1)?.index
    if (lastFilledIndex == null) return { ok: false, index: null }
    const lastFilled = lines[lastFilledIndex]
    if (!lastFilled || lastFilled.readOnly || !isLineComplete(lastFilled)) {
      return { ok: false, index: null }
    }
    if (state.perLine[lastFilledIndex] !== 'ok') return { ok: false, index: null }
    const openAssumptionDepths = getEffectiveAssumptionDepths(
      lines,
      usesNestedSubderivations,
      activeAssumptionRules
    )
    const resolved = isResolvedConclusionLine({
      line: lastFilled,
      index: lastFilledIndex,
      conclusion: proof?.conclusion,
      normalizeFormula,
      notation,
      openAssumptionDepths,
    })
    return { ok: resolved, index: resolved ? lastFilledIndex : null }
  }, [
    activeAssumptionRules,
    enabled,
    isLineComplete,
    lines,
    normalizeFormula,
    notation,
    premises.length,
    proof?.conclusion,
    state.perLine,
    usesNestedSubderivations,
  ])

  useEffect(() => {
    if (looksGood.ok) {
      if (
        notice.tone !== 'success'
        || notice.message !== 'Derivation looks good.'
        || notice.index !== looksGood.index
      ) {
        setNotice({ index: looksGood.index, message: 'Derivation looks good.', tone: 'success' })
      }
      return
    }
    if (notice.tone === 'success') setNotice(EMPTY_NOTICE)
  }, [looksGood, notice.index, notice.message, notice.tone])

  return {
    autoCheckEnabled: enabled,
    autoCheckState: state,
    clearLineGateNotice: clearNotice,
    lineGateNotice: notice,
    setAutoCheckEnabled: setEnabled,
    setAutoCheckState: setState,
    setLineGateErrorNotice: showError,
  }
}
