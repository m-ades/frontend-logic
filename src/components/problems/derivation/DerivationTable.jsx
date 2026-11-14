import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableContainer,
  TableRow,
} from '@mui/material'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import useMobileLogicKeyboardEnabled from '../../../hooks/useMobileLogicKeyboardEnabled.js'
import { getDerivationCheckerForLogicSystem } from '@logic-app/logic-engine/checkers/derivation-by-logic-system.js'
import getSyntax from '@logic-app/logic-engine/symbolic/libsyntax.js'
import {
  getDerivationProblemType,
  getNotation,
  getSymbols,
  normalizeLogicSystem,
} from '../../../lib/logicSystems.js'
import {
  getDerivationRuleLookup,
  getDerivationRules,
} from '../../../lib/derivationRules.js'
import { getRulesetRestrictions } from '@logic-app/logic-engine/checkers/derivation-rule-restrictions.js'
import { justParse } from '@logic-app/logic-engine/justification-parse.js'
import {
  announceAssignmentSubmission,
  buildPersistedSubmissionState,
  shouldUseApiValidation,
  submitApiValidation,
} from '../../../utils/submissionRuntime.js'
import {
  FITCH_ASSUMPTION_RULES,
  HURLEY_ASSUMPTION_RULES,
  INDENT_END_RULES,
  applyLinesToJustification,
  applyRuleToJustification,
  buildSubmission,
  formatJustificationDisplay,
  formatJustificationParts,
  getFitchScopeInfo,
  getJustificationMeta,
  getOpenAssumptionDepths,
  getRuleFromJustification,
  isDerivationFieldReadOnly,
  normalizeJustificationForDisplay,
} from './derivationUtils.js'
import {
  DERIVATION_FORMULA_MIN_WIDTH,
  DERIVATION_FORMULA_WIDTH,
  DERIVATION_PROMPT_FONT_SIZE,
  RULE_INPUT_MODE_KEY,
  getDerivationKeyboardConfig,
  getDerivationRowSx,
  getDerivationScoreLabel,
  getSymbolButtons,
  parseRulesetRules,
} from './derivationTableConfig.js'
import DerivationConclusionRow from './DerivationConclusionRow.jsx'
import DerivationFeedbackPanel from './DerivationFeedbackPanel.jsx'
import DerivationFormulaCell from './DerivationFormulaCell.jsx'
import DerivationHeader from './DerivationHeader.jsx'
import DerivationJustificationCell from './DerivationJustificationCell.jsx'
import DerivationKeyboardRow from './DerivationKeyboardRow.jsx'
import DerivationLineNumberCell from './DerivationLineNumberCell.jsx'
import DerivationPhonePlaceholder from './DerivationPhonePlaceholder.jsx'
import ProblemFrame from '../mui/frame/ProblemFrame.jsx'
import useDerivationAutoCheck from './useDerivationAutoCheck.js'
import useDerivationInputTracking from './useDerivationInputTracking.js'
import useDerivationProof from './useDerivationProof.js'

const LINE_GATE_MESSAGE = 'Re-check current line to move onto the next line.'

const DERIVATION_FULLSCREEN_STACK_SX = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const DERIVATION_FULLSCREEN_ACTION_BAR_SX = {
  mt: 1,
  flexShrink: 0,
  pl: 2,
  pr: 0,
  pt: 1.5,
  pb: 2,
  bgcolor: 'background.paper',
  borderTop: 1,
  borderColor: 'divider',
}

function getDerivationWrapperSx({ isFullScreen, hideActions }) {
  if (isFullScreen) {
    return {
      py: 2,
      pl: 0,
      pr: 0,
      position: 'relative',
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      width: '100%',
      maxWidth: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflowY: 'auto',
      overflowX: 'hidden',
    }
  }
  return hideActions ? { p: 0, position: 'relative', width: '100%' } : undefined
}

// fullscreen drops the extra padding and lets the table fill the overlay
const getDerivationTableContainerSx = (isFullScreen) => ({
  width: '100%',
  ...(isFullScreen
    ? { overflowX: 'hidden', overflow: 'visible', padding: 0, margin: 0 }
    : { overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }),
})

// fullscreen pins the layout and drops right padding on the last column
const getDerivationTableSx = ({ isFullScreen, isMobile }) => ({
  '& .MuiTableRow-root': { height: 'auto' },
  ...(isFullScreen
    ? {
        tableLayout: 'fixed',
        width: '100%',
        '& td:last-child': { paddingRight: '0 !important' },
        '& .MuiTableCell-root:last-child': { paddingRight: '0 !important' },
      }
    : { width: 'auto', minWidth: isMobile ? DERIVATION_FORMULA_MIN_WIDTH : DERIVATION_FORMULA_WIDTH }),
})

function applyLineChange(lines, index, field, value) {
  const line = lines[index]
  if (isDerivationFieldReadOnly(line, field)) return lines
  return lines.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [field]: value } : item
  ))
}

export default function DerivationTable({
  proof,
  logicSystem,
  savedState,
  onStateChange,
  onAttempt,
  onProofComplete,
  attemptCount,
  attemptLimit,
  isChecking,
  setAttemptCount,
  setAttemptLimit,
  setStatusBanner,
  setIsChecking,
  isAssignmentLocked = true,
  isMobile = false,
  isPhone = false,
  isFullScreen = false,
  initialFocusLineIndex = null,
  initialFocusField = null,
  onOpenFullScreen,
  onCloseFullScreen,
  totalQuestions,
  isCurrentCorrect,
  currentQuestionScore,
  isInstructorView = false,
  onEditQuestion,
  problemLabel,
  status,
  message,
  onCloseStatus,
  hideActions = false,
  fixedLines = null,
}) {
  const mobileLogicKeyboardEnabled = useMobileLogicKeyboardEnabled()
  const activeLogicSystem = normalizeLogicSystem(logicSystem)
  const notation = getNotation(activeLogicSystem)
  const symbols = getSymbols(activeLogicSystem)
  const derivationProblemType = getDerivationProblemType(activeLogicSystem)
  const usesNestedSubderivations = derivationProblemType === 'derivation-calgary'
  const allowIndexedSymbols = activeLogicSystem === 'fitch'
  const activeAssumptionRules = usesNestedSubderivations ? FITCH_ASSUMPTION_RULES : HURLEY_ASSUMPTION_RULES
  const checkDerivation = useMemo(() => {
    const checker = getDerivationCheckerForLogicSystem(activeLogicSystem)
    return (question, givenans, options) =>
      checker(question, null, givenans, false, true, options)
  }, [activeLogicSystem])
  const allDerivationRules = getDerivationRules(activeLogicSystem)
  const derivationRuleLookup = getDerivationRuleLookup(activeLogicSystem)
  const syntax = useMemo(() => getSyntax(notation), [notation])
  const {
    argumentTarget,
    buildFreshLines,
    conclusionTargetText,
    initialLines,
    isFixedProof,
    normalizeFormulaForDisplay,
    premises,
    tidyTypedFormula,
  } = useDerivationProof({
    activeLogicSystem,
    fixedLines,
    notation,
    proof,
    savedState,
    syntax,
    usesNestedSubderivations,
  })
  const usesFixedScopeNesting = isFixedProof && usesNestedSubderivations

  const [lines, setLines] = useState(initialLines)
  const [lastSubmitStatus, setLastSubmitStatus] = useState(null)
  const onStateChangeRef = useRef(onStateChange)

  const [ruleInputMode, setRuleInputMode] = useState(() => {
    if (typeof window === 'undefined') return 'dropdown'
    try {
      const stored = window.localStorage.getItem(RULE_INPUT_MODE_KEY)
      return stored === 'type' ? 'type' : 'dropdown'
    } catch {
      return 'dropdown'
    }
  })
  const useRuleDropdown = ruleInputMode === 'dropdown'
  const handleRuleInputModeChange = useCallback((_, value) => {
    if (value == null) return
    setRuleInputMode(value)
    try {
      window.localStorage.setItem(RULE_INPUT_MODE_KEY, value)
    } catch {
      // ignore
    }
  }, [])

  const allowedRules = useMemo(() => {
    const { allow: allowRules, deny: denyRules } = getRulesetRestrictions(
      { ruleset: proof?.ruleset },
      proof?.options
    )
    const allow = parseRulesetRules(allowRules, derivationRuleLookup)
    const deny = parseRulesetRules(denyRules, derivationRuleLookup)
    const denied = new Set(deny.rules.map((rule) => rule.toLowerCase()))
    const sourceRules = allow.hasEntries ? allow.rules : allDerivationRules
    return sourceRules.filter((rule) => !denied.has(rule.toLowerCase()))
  }, [proof?.ruleset, proof?.options?.ruleset, allDerivationRules, derivationRuleLookup])

  const derivationKeyboardConfig = useMemo(
    () => getDerivationKeyboardConfig(proof, { symbols, syntax, allowIndexedSymbols }),
    [allowIndexedSymbols, proof, symbols, syntax]
  )
  // special symbols follow the brackets like every other symbol row
  const symbolButtons = useMemo(() => [
    ...getSymbolButtons(symbols, syntax),
    ...(derivationKeyboardConfig.extraSymbolButtons || []),
  ], [derivationKeyboardConfig.extraSymbolButtons, symbols, syntax])
  const isLineCompleteForCheck = useCallback((line) => {
    if (!line) return false
    const formulaFilled = (line.formula || '').trim().length > 0
    if (!formulaFilled) return false
    const { hasLines, hasRule } = getJustificationMeta(line.justification)
    if (!hasRule) return false
    const rule = getRuleFromJustification(line.justification).toUpperCase()
    if (!usesNestedSubderivations && INDENT_END_RULES.has(rule)) {
      const { ranges } = justParse(String(line.justification || ''))
      return ranges.length > 0
    }
    if (hasLines) return true
    if (!rule) return false
    return activeAssumptionRules.has(rule)
  }, [activeAssumptionRules, usesNestedSubderivations])
  const [lineDrafts, setLineDrafts] = useState({})
  const pendingFocusRef = useRef(null)
  const effectiveLines = useMemo(
    () =>
      lines.map((line, idx) => {
        if (!useRuleDropdown || !(idx in lineDrafts)) return line
        return {
          ...line,
          // Keep indentation/reactivity in sync while line(s) drafts are being edited.
          justification: applyLinesToJustification(line.justification, lineDrafts[idx], {
            rulesFirst: usesNestedSubderivations,
          }),
        }
      }),
    [lineDrafts, lines, useRuleDropdown, usesNestedSubderivations]
  )
  // discharge only applies to non-fixed nested (fitch) proofs
  const fitchScopeInfo = useMemo(() => (
    usesNestedSubderivations && !isFixedProof
      ? getFitchScopeInfo(effectiveLines, activeAssumptionRules)
      : null
  ), [activeAssumptionRules, effectiveLines, isFixedProof, usesNestedSubderivations])
  const indentLevels = useMemo(() => {
    const inferred = fitchScopeInfo?.depths ?? getOpenAssumptionDepths(effectiveLines, {
      mode: usesNestedSubderivations ? 'nested' : 'flat',
      assumptionRules: activeAssumptionRules,
    })
    if (!isFixedProof) return inferred
    return effectiveLines.map((line, index) => (
      Number.isInteger(line.scopeDepth) ? line.scopeDepth : inferred[index]
    ))
  }, [activeAssumptionRules, effectiveLines, fitchScopeInfo, isFixedProof, usesNestedSubderivations])
  const dischargeStatusByLine = fitchScopeInfo?.dischargedByLine ?? []
  const dischargeOpenCountByLine = fitchScopeInfo?.openCountByLine ?? []

  const normalizeJustification = useCallback((value) => String(value ?? '').trim(), [])

  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  const buildCurrentSubmission = useCallback((linesSnapshot) => buildSubmission(
    linesSnapshot,
    proof?.conclusion,
    premises,
    tidyTypedFormula,
    normalizeJustification,
    {
      nestedSubderivations: usesNestedSubderivations,
      assumptionRules: activeAssumptionRules,
      canonicalScopes: usesFixedScopeNesting,
    }
  ), [activeAssumptionRules, premises, proof?.conclusion, tidyTypedFormula, normalizeJustification, usesFixedScopeNesting, usesNestedSubderivations])

  const emitState = useCallback((linesSnapshot, options = {}) => {
    const submission = buildCurrentSubmission(linesSnapshot)
    if (options.immediate) {
      return onStateChangeRef.current?.(submission, options)
    }
    queueMicrotask(() => {
      onStateChangeRef.current?.(submission, options)
    })
  }, [buildCurrentSubmission])

  const {
    autoCheckEnabled,
    autoCheckState,
    clearLineGateNotice,
    lineGateNotice,
    runAutoCheck,
    setAutoCheckEnabled,
    setAutoCheckState,
    setLineGateErrorNotice,
  } = useDerivationAutoCheck({
    activeAssumptionRules,
    checkDerivation,
    isLineComplete: isLineCompleteForCheck,
    lines,
    normalizeFormula: tidyTypedFormula,
    normalizeJustification,
    notation,
    pendingFocusRef,
    premises,
    proof,
    setLines,
    usesFixedScopeNesting,
    usesNestedSubderivations,
  })

  const handleLineChange = (index, field, value) => {
    if (isDerivationFieldReadOnly(lines[index], field)) return
    setLines((prev) => applyLineChange(prev, index, field, value))
    setAutoCheckState((prev) => ({
      perLine: { ...prev.perLine, [index]: null },
      rows: (prev.rows || []).filter((row) => row.line !== String(index + 1)),
    }))
    if (lineGateNotice.index === index) {
      clearLineGateNotice()
    }
  }

  const {
    activeFormulaIndex,
    activateFormula,
    activateJustification,
    focusFormula,
    focusJustification,
    getCitationTargetIndex,
    insertSymbol,
    registerFormulaInput,
    registerJustificationInput,
    resetInputRefs,
    restoreCaret,
  } = useDerivationInputTracking({
    initialFocusField: isFullScreen ? initialFocusField : null,
    initialFocusLineIndex: isFullScreen ? initialFocusLineIndex : null,
    lines,
    premisesCount: premises.length,
    useRuleDropdown,
    onFieldChange: handleLineChange,
  })

  const handleJustificationChange = (event, index) => {
    if (isDerivationFieldReadOnly(lines[index], 'justification')) return
    const el = event.target
    const raw = el?.value ?? ''
    const normalized = normalizeJustificationForDisplay(raw)
    handleLineChange(index, 'justification', normalized)
    restoreCaret(index, el, raw, normalized, normalizeJustificationForDisplay)
  }

  // the typed rule field of a line whose line(s) were provided holds only the rule
  const handleRuleTextChange = (event, index) => {
    const line = lines[index]
    if (isDerivationFieldReadOnly(line, 'rule')) return
    const el = event.target
    const raw = el?.value ?? ''
    const rule = getRuleFromJustification(raw)
    handleLineChange(index, 'justification', applyRuleToJustification(line.justification, rule, {
      rulesFirst: usesNestedSubderivations,
    }))
    restoreCaret(index, el, raw, rule, getRuleFromJustification)
  }

  const handleRuleTextCommit = (index) => {
    handleLineCommit(index, 'justification', lines[index]?.justification ?? '')
  }

  const commitLines = useCallback((updater, clearNoticeIndex = null) => {
    setLines((prev) => {
      const nextLines = updater(prev)
      emitState(nextLines)
      return nextLines
    })
    if (clearNoticeIndex !== null && lineGateNotice.index === clearNoticeIndex) {
      clearLineGateNotice()
    }
  }, [clearLineGateNotice, emitState, lineGateNotice.index])

  useEffect(() => {
    if (pendingFocusRef.current === null) return
    const targetIdx = pendingFocusRef.current
    pendingFocusRef.current = null
    setTimeout(() => focusFormula(targetIdx), 0)
  }, [lines.length])

  const handleLineCommit = (index, field, value) => {
    if (isDerivationFieldReadOnly(lines[index], field)) return
    const committedValue = field === 'formula'
      ? normalizeFormulaForDisplay(value)
      : value
    commitLines(
      (prev) => applyLineChange(prev, index, field, committedValue),
      index
    )
  }

  const clearLineDraft = (index) => setLineDrafts((previous) => {
    if (!(index in previous)) return previous
    const next = { ...previous }
    delete next[index]
    return next
  })

  const handleCitationChange = (index, line, raw) => {
    if (isDerivationFieldReadOnly(line, 'citations')) return
    setLineDrafts((previous) => ({ ...previous, [index]: raw }))
    handleLineChange(index, 'justification', applyLinesToJustification(line.justification, raw, {
      rulesFirst: usesNestedSubderivations,
    }))
  }

  const handleCitationCommit = (index, line, raw) => {
    if (isDerivationFieldReadOnly(line, 'citations')) return
    handleLineCommit(index, 'justification', applyLinesToJustification(line.justification, raw, {
      rulesFirst: usesNestedSubderivations,
    }))
    clearLineDraft(index)
  }

  const handleTypedJustificationCommit = (index, rawValue) => {
    const raw = String(rawValue || '').trim()
    const formatted = raw && !usesNestedSubderivations
      ? formatJustificationDisplay(raw)
      : raw
    if (formatted !== raw) handleLineChange(index, 'justification', formatted)
    handleLineCommit(index, 'justification', formatted || raw)
  }

  const handleRuleChange = (index, line, selectedRule) => {
    if (isDerivationFieldReadOnly(line, 'rule')) return
    const upperRule = selectedRule.toUpperCase()
    const currentJustification = index in lineDrafts
      ? applyLinesToJustification(line.justification, lineDrafts[index], {
        rulesFirst: usesNestedSubderivations,
      })
      : line.justification
    // an assumption cites nothing so its line(s) clear, unless the author provided them
    const keepsCitations = !activeAssumptionRules.has(upperRule) || isDerivationFieldReadOnly(line, 'citations')
    const nextValue = applyRuleToJustification(keepsCitations ? currentJustification : '', selectedRule, {
      rulesFirst: usesNestedSubderivations,
    })

    commitLines((previous) => {
      let nextLines = applyLineChange(previous, index, 'justification', nextValue)
      if (!activeAssumptionRules.has(upperRule)) return nextLines
      if (isFixedProof) return nextLines

      const nextIndex = index + 1
      const nextLine = nextLines[nextIndex]
      const isBlankLine = nextLine && !nextLine.readOnly
        && !(nextLine.formula || '').trim()
        && !(nextLine.justification || '').trim()
      if (isBlankLine || (nextLine && nextLine.readOnly)) return nextLines

      nextLines = [
        ...nextLines.slice(0, nextIndex),
        { formula: '', justification: '', readOnly: false },
        ...nextLines.slice(nextIndex),
      ]
      pendingFocusRef.current = nextIndex
      return nextLines
    }, index)

    clearLineDraft(index)
    if (!activeAssumptionRules.has(upperRule) && usesNestedSubderivations) {
      window.setTimeout(() => focusJustification(index), 0)
    }
  }

  // cycles how many scopes this line closes, 0 up to however many are open, wrapping back to 0
  const handleToggleDischarge = (index) => {
    const line = lines[index]
    if (!line || line.readOnly || isFixedProof) return
    const max = dischargeOpenCountByLine[index] ?? 0
    commitLines(
      (previous) => previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const current = Number(item.dischargesScope) || 0
        return { ...item, dischargesScope: current >= max ? 0 : current + 1 }
      }),
      index
    )
  }

  // click row number to toggle it in the current line's line(s) field
  const handleRowNumberClick = (clickedLineNum) => {
    const targetIdx = getCitationTargetIndex()
    if (targetIdx < premises.length) return
    commitLines((prev) => {
      const line = prev[targetIdx]
      if (isDerivationFieldReadOnly(line, 'citations')) return prev
      const { nums, ranges, citedrules } = justParse(String(line.justification || ''))
      const hasLineNum = nums.includes(clickedLineNum)
      const nextNums = hasLineNum
        ? nums.filter((n) => n !== clickedLineNum)
        : [...nums, clickedLineNum]
      const newNums = [...new Set(nextNums)].sort((a, b) => a - b)
      const newJust = formatJustificationParts(newNums, ranges, citedrules, {
        rulesFirst: usesNestedSubderivations,
      })
      return applyLineChange(prev, targetIdx, 'justification', newJust)
    })
    clearLineDraft(targetIdx)
  }

  const canAddLine = useMemo(() => {
    if (!autoCheckEnabled) return true
    const last = lines[lines.length - 1]
    if (!last || last.readOnly) return true
    if (!isLineCompleteForCheck(last)) return false
    return autoCheckState.perLine[lines.length - 1] === 'ok'
  }, [autoCheckEnabled, lines, autoCheckState.perLine, isLineCompleteForCheck])

  const addLine = () => {
    if (isFixedProof) return
    if (autoCheckEnabled && !canAddLine) {
      setLineGateErrorNotice(lines.length - 1, LINE_GATE_MESSAGE)
      return
    }
    const nextIndex = lines.length
    setLines((prev) => [...prev, { formula: '', justification: '', readOnly: false }])
    pendingFocusRef.current = nextIndex
  }

  const deleteLine = (index) => {
    if (isFixedProof) return
    if (index < premises.length) return
    commitLines((prev) => {
      if (index < premises.length || prev.length === 0) return prev
      const next = prev.filter((_, idx) => idx !== index)
      const hasEditable = next.some((line, idx) => idx >= premises.length && !line.readOnly)
      if (!hasEditable) {
        next.push({ formula: '', justification: '', readOnly: false })
      }
      pendingFocusRef.current = Math.min(index, next.length - 1)
      return next
    }, index)
    setLineDrafts((prev) => {
      const next = {}
      Object.keys(prev).forEach((key) => {
        const idx = Number(key)
        if (!Number.isFinite(idx)) return
        if (idx < index) {
          next[idx] = prev[key]
          return
        }
        if (idx > index) {
          next[idx - 1] = prev[key]
        }
      })
      return next
    })
    resetInputRefs()
  }

  // enter, or the right arrow once the formula's closers are all in, carries on to the justification
  const handleFormulaKeyDown = (event, index, field) => {
    if (isDerivationFieldReadOnly(lines[index], 'formula')) return
    if (event.key === 'Enter') {
      event.preventDefault()
      handleLineCommit(index, 'formula', tidyTypedFormula(field.value))
      focusJustification(index)
      return
    }
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey
    if (event.key === 'ArrowRight' && plain && field.selectionEnd >= field.value.length) {
      event.preventDefault()
      focusJustification(index)
    }
  }

  // part is rule for the typed rule field, which has already applied its text to the line
  const handleJustKeyDown = async (event, index, part) => {
    if (isDerivationFieldReadOnly(lines[index], 'justification')) return
    if (event.key === 'ArrowLeft' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const el = event.target
      const start = typeof el.selectionStart === 'number' ? el.selectionStart : 0
      if (start <= 0) {
        event.preventDefault()
        focusFormula(index)
      }
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const formatted = part === 'rule'
        ? lines[index]?.justification ?? ''
        : applyLinesToJustification(lines[index]?.justification, event.target.value, {
          rulesFirst: usesNestedSubderivations,
        })
      const nextLines = applyLineChange(lines, index, 'justification', formatted)
      setLines(nextLines)
      emitState(nextLines)
      clearLineDraft(index)
      if (autoCheckEnabled) {
        try {
          const result = await runAutoCheck(nextLines)
          setAutoCheckState(result)
          if (result.perLine[index] !== 'ok') {
            setLineGateErrorNotice(index, LINE_GATE_MESSAGE)
            return
          }
        } catch (err) {
          setLineGateErrorNotice(index, LINE_GATE_MESSAGE)
          return
        }
      }
      const nextIndex = index + 1
      if (isFixedProof && nextIndex >= lines.length) return
      if (nextIndex >= lines.length) {
        addLine()
        setTimeout(() => focusFormula(nextIndex), 0)
      } else {
        if (isFixedProof && isDerivationFieldReadOnly(lines[nextIndex], 'formula')) {
          focusJustification(nextIndex)
        } else {
          focusFormula(nextIndex)
        }
      }
    }
  }

  const handleStartOver = async () => {
    if (isLocked || isAssignmentLocked) return
    const previousLines = lines
    const nextLines = buildFreshLines()
    setLines(nextLines)
    setLastSubmitStatus(null)
    setStatusBanner({ status: 'unanswered', message: '' })
    try {
      await emitState(nextLines, { immediate: true })
    } catch {
      setLines(previousLines)
      setStatusBanner({
        status: 'malfunction',
        message: 'Could not clear answer. Check your connection and try again.',
      })
    }
  }

  // fixed proofs only need symbol keys when a formula is left for the student
  const hasEditableFormula = lines.some((line) => !isDerivationFieldReadOnly(line, 'formula'))
  const hasStartedLine = lines.some((line) => (
    !line.readOnly && (
      String(line.justification || '').trim()
      || (!isFixedProof && String(line.formula || '').trim())
    )
  ))

  // practice grades in the browser without spending a server attempt
  const checkLocally = async (submissionData) => {
    const validation = await checkDerivation(
      { prems: premises, conc: proof?.conclusion, ruleset: proof?.ruleset },
      submissionData.ans,
      { ...(proof?.options || {}), notation }
    )
    const successstatus = validation?.successstatus || 'incorrect'
    return {
      validation,
      successstatus,
      rawScore: successstatus === 'correct' ? 100 : 0,
      attempt: null,
    }
  }

  const handleSubmit = async () => {
    if (isAssignmentLocked) return
    if (!hasStartedLine) return
    setIsChecking(true)
    try {
      const submissionData = buildCurrentSubmission(lines)
      const isRemote = shouldUseApiValidation(proof?.questionId)
      const outcome = isRemote
        ? await submitApiValidation({ assignmentQuestionId: proof?.questionId, submissionData })
        : await checkLocally(submissionData)
      const { validation, successstatus, rawScore, attempt } = outcome
      const nextAttemptLimit = isRemote ? outcome.attemptLimit : attemptLimit
      const nextAttempt = attempt ?? attemptCount + 1
      setLastSubmitStatus(successstatus)
      if (isRemote && typeof nextAttemptLimit === 'number') {
        setAttemptLimit(nextAttemptLimit)
      }
      setAttemptCount((prev) => attempt ?? prev + 1)
      onStateChangeRef.current?.(buildPersistedSubmissionState({
        answerState: submissionData,
        attemptCount: nextAttempt,
        status: successstatus,
        rawScore,
      }))
      if (isRemote) {
        announceAssignmentSubmission({
          assignmentQuestionId: proof?.questionId,
          attempt,
          attemptLimit: nextAttemptLimit,
          isCorrect: successstatus === 'correct',
          score: rawScore,
        })
      }
      setStatusBanner({
        status: successstatus,
        message: validation?.message || validation?.transmessage || (successstatus === 'correct' ? 'Correct!' : 'Incorrect.'),
      })
      onAttempt?.({
        attempt: nextAttempt,
        attemptLimit: nextAttemptLimit,
      })
      if (successstatus === 'correct') {
        onProofComplete?.(proof.id)
      }
    } catch (err) {
      setStatusBanner({ status: 'malfunction', message: 'Error submitting answer' })
      setLastSubmitStatus(null)
    } finally {
      setIsChecking(false)
    }
  }

  const isLocked = Number.isFinite(attemptLimit) && attemptCount >= attemptLimit
  const submitDisabled = isLocked || isAssignmentLocked || !hasStartedLine

  // open fullscreen when user taps an input on the table. phones only (not tablets).
  const canOpenFullScreen = isPhone && !isFullScreen && typeof onOpenFullScreen === 'function'

  const requestFullScreenFor = (lineIndex, field) => (event) => {
    if (!canOpenFullScreen) return
    event.preventDefault()
    event.stopPropagation()
    onOpenFullScreen({ lineIndex, field })
  }

  const usesProblemFrame = !isFullScreen && !hideActions
  const Wrapper = usesProblemFrame ? ProblemFrame : Box
  const scoreLabel = isPhone && isFullScreen
    ? getDerivationScoreLabel({
        attemptCount,
        attemptLimit,
        currentQuestionScore,
        isCurrentCorrect,
        lastSubmitStatus,
        totalQuestions,
      })
    : null
  const actionButtons = (
    <ProblemSetButtons
      onCheck={handleSubmit}
      onStartOver={handleStartOver}
      isChecking={isChecking}
      isDisabled={submitDisabled}
      align="flex-start"
      attemptCount={attemptCount}
      attemptLimit={attemptLimit}
      sx={isFullScreen ? { mt: 1 } : undefined}
      scoreLabel={scoreLabel}
    />
  )

  return (
    <Stack spacing={2} sx={isFullScreen ? DERIVATION_FULLSCREEN_STACK_SX : undefined}>
      <Wrapper {...(usesProblemFrame ? {
        expandForContent: true,
        problemLabel,
        prompt: proof.description,
        promptSx: { fontSize: DERIVATION_PROMPT_FONT_SIZE },
        isInstructorView,
        onEditQuestion,
        status,
        message,
        onCloseStatus,
        actionNode: actionButtons,
      } : { sx: getDerivationWrapperSx({ isFullScreen, hideActions }) })}>
        {isPhone && !isFullScreen && canOpenFullScreen ? (
          <DerivationPhonePlaceholder onOpen={() => onOpenFullScreen(null)} />
        ) : (
        <>
        <DerivationHeader
          allowedRules={allowedRules}
          argument={argumentTarget}
          isFullScreen={isFullScreen}
          onRuleInputModeChange={handleRuleInputModeChange}
          ruleInputMode={ruleInputMode}
          showDerivationLabel={usesNestedSubderivations && !isFixedProof}
        />
        <TableContainer component={Box} sx={getDerivationTableContainerSx(isFullScreen)}>
          <Table size={isMobile ? 'small' : 'medium'} sx={getDerivationTableSx({ isFullScreen, isMobile })}>
            <TableBody>
            {!usesNestedSubderivations && !isFixedProof && premises.length === 0 && proof?.conclusion && (
              <DerivationConclusionRow
                key="conclusion-row"
                isFullScreen={isFullScreen}
                isMobile={isMobile}
                onInsert={(insert) => insertSymbol({ insert })}
                text={conclusionTargetText}
              />
            )}
            {lines.map((line, idx) => {
              const scopeDepth = indentLevels[idx] || 0
              const startsScope = usesNestedSubderivations && (
                isFixedProof
                  ? line.startsScope === true
                  : activeAssumptionRules.has(
                      getRuleFromJustification(line.justification).toUpperCase()
                    )
              )
              const isLastPremiseLine = usesNestedSubderivations && idx === premises.length - 1
              const showsFitchDivider = isLastPremiseLine || startsScope
              return (
              <TableRow key={`line-${idx}`} sx={getDerivationRowSx(isMobile)}>
                <DerivationLineNumberCell
                  isFullScreen={isFullScreen}
                  isMobile={isMobile}
                  lineNumber={idx + 1}
                  onCite={() => handleRowNumberClick(idx + 1)}
                  showsFitchLine={usesNestedSubderivations}
                />
                <DerivationFormulaCell
                  activeLogicSystem={activeLogicSystem}
                  depth={scopeDepth}
                  isFullScreen={isFullScreen}
                  isPhone={isPhone}
                  keyboardConfig={derivationKeyboardConfig}
                  line={line}
                  lineIndex={idx}
                  onActivate={() => activateFormula(idx)}
                  onChange={(value) => handleLineChange(idx, 'formula', value)}
                  onCommit={(value) => handleLineCommit(idx, 'formula', tidyTypedFormula(value))}
                  onInsert={(insert) => insertSymbol({ insert })}
                  onKeyDown={(event, field) => handleFormulaKeyDown(event, idx, field)}
                  onRequestFullScreen={requestFullScreenFor(idx, 'formula')}
                  registerInput={registerFormulaInput(idx)}
                  showsDivider={showsFitchDivider}
                  startsScope={startsScope}
                />
                <DerivationJustificationCell
                  activeFormulaIndex={activeFormulaIndex}
                  allowedRules={allowedRules}
                  assumptionRules={activeAssumptionRules}
                  autoCheckEnabled={autoCheckEnabled}
                  autoCheckStatus={autoCheckState.perLine[idx]}
                  canDelete={!isFixedProof}
                  canDischargeMore={dischargeStatusByLine[idx] < dischargeOpenCountByLine[idx]}
                  citationDraft={lineDrafts[idx]}
                  conclusion={isFixedProof ? '' : conclusionTargetText}
                  isDischarged={dischargeStatusByLine[idx]}
                  isFullScreen={isFullScreen}
                  isMobile={isMobile}
                  isPhone={isPhone}
                  line={line}
                  lineIndex={idx}
                  mobileKeyboardEnabled={mobileLogicKeyboardEnabled}
                  onActivate={() => activateJustification(idx)}
                  onCitationChange={(raw) => handleCitationChange(idx, line, raw)}
                  onCitationCommit={(raw) => handleCitationCommit(idx, line, raw)}
                  onDelete={() => deleteLine(idx)}
                  onInsert={(insert) => insertSymbol({ insert })}
                  onJustificationChange={(event) => handleJustificationChange(event, idx)}
                  onKeyDown={(event, part) => handleJustKeyDown(event, idx, part)}
                  onRequestFullScreen={requestFullScreenFor(idx, 'justification')}
                  onRuleChange={(rule) => handleRuleChange(idx, line, rule)}
                  onRuleTextChange={(event) => handleRuleTextChange(event, idx)}
                  onRuleTextCommit={() => handleRuleTextCommit(idx)}
                  onToggleDischarge={() => handleToggleDischarge(idx)}
                  onTypedCommit={(raw) => handleTypedJustificationCommit(idx, raw)}
                  persistentUnderline={isFixedProof}
                  premisesCount={premises.length}
                  registerInput={registerJustificationInput(idx)}
                  showDischargeControl={usesNestedSubderivations && !isFixedProof && dischargeOpenCountByLine[idx] > 0}
                  useRuleDropdown={useRuleDropdown}
                  usesNestedSubderivations={usesNestedSubderivations}
                />
              </TableRow>
              )
            })}
            {(!isFixedProof || hasEditableFormula) && (
              <DerivationKeyboardRow
                canAddLine={canAddLine}
                isFullScreen={isFullScreen}
                isMobile={isMobile}
                isPhone={isPhone}
                mobileLogicKeyboardEnabled={mobileLogicKeyboardEnabled}
                onAddLine={isFixedProof ? undefined : addLine}
                onInsert={insertSymbol}
                symbolButtons={symbolButtons}
              />
            )}
            </TableBody>
          </Table>
        </TableContainer>

        <DerivationFeedbackPanel
          autoCheckEnabled={autoCheckEnabled}
          autoCheckRows={autoCheckState.rows}
          hasCheckedLine={Object.values(autoCheckState.perLine).some((status) => status === 'ok')}
          isFullScreen={isFullScreen}
          lineGateNotice={lineGateNotice}
          onToggleAutoCheck={() => setAutoCheckEnabled((enabled) => !enabled)}
        />

        </>
        )}

      </Wrapper>
      {/* fullscreen keeps a sticky button row outside the frame */}
      {isFullScreen && !hideActions && (
        <Box sx={DERIVATION_FULLSCREEN_ACTION_BAR_SX}>
          {actionButtons}
        </Box>
      )}
    </Stack>
  )
}
