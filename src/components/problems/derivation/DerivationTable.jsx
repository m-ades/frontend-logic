import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Stack,
} from '@mui/material'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { justParse } from '../../ui/logicpenguin/justification-parse.js'
import DerivationFeedbackPanel from './DerivationFeedbackPanel.jsx'
import {
  handleDerivationFormulaKeyDown,
  handleDerivationJustificationKeyDown,
} from './derivationInputHandlers.js'
import DerivationTableRows from './DerivationTableRows.jsx'
import DerivationToolbarRow from './DerivationToolbarRow.jsx'
import DerivationWorkspace from './DerivationWorkspace.jsx'
import {
  deriveDerivationLooksGood,
  runDerivationAutoCheck,
  submitDerivationAnswer,
} from './derivationWorkflow.js'
import {
  ALL_DERIVATION_RULES,
  AUTO_CHECK_STORAGE_KEY,
  applyLinesToJustification,
    buildSubmission,
    extractLines,
    formatJustificationParts,
    formatRuleName,
    formulasEqualNormally,
    getConstantLettersFromPrompt,
    getInputUnderlineSx,
    getJustificationMeta,
    getPredicateLettersFromKey,
    getPropositionalLettersFromFormulas,
    getRuleFromJustification,
    isPredicateLogicKey,
    PREDICATE_VARIABLES,
  getSelectUnderlineSx,
  INDENT_END_RULES,
  INDENT_START_RULES,
  RULE_INPUT_MODE_KEY,
  RULES_ALLOW_NO_LINES,
  MAX_INDENT_LEVEL,
} from './derivationUtils.js'

export default function DerivationTable({
  proof,
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
  totalQuestions,
  isCurrentCorrect,
  currentQuestionScore,
  isInstructorView = false,
  onEditQuestion,
  problemLabel,
  hideActions = false,
}) {
  const formulaRefs = useRef({})
  const justRefs = useRef({})
  const [activeFormulaIndex, setActiveFormulaIndex] = useState(null)
  const lastEditableIndexRef = useRef(null)
  const cursorPositionsRef = useRef({})
  const syntax = useMemo(() => getSyntax(), [])
  const premises = useMemo(
    () => (Array.isArray(proof?.premises) ? proof.premises : []),
    [proof?.premises]
  )
  const initialLines = useMemo(() => {
    const fromState = extractLines(savedState, premises)
    if (fromState.length) return fromState
    const premLines = premises.map((p) => ({ formula: p, justification: '', readOnly: true }))
    const blanks = Array.from({ length: 1 }, () => ({ formula: '', justification: '', readOnly: false }))
    return [...premLines, ...blanks]
  }, [savedState, premises])

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
    const allow = proof?.ruleset?.allow ?? proof?.options?.ruleset?.allow
    if (Array.isArray(allow) && allow.length > 0) {
      const unique = Array.from(new Set(allow.map((rule) => formatRuleName(String(rule)))))
      return unique.filter((rule) => rule && rule.toLowerCase() !== 'pr')
    }
    return ALL_DERIVATION_RULES
  }, [proof?.ruleset, proof?.options?.ruleset])
  // rebuild mobile keyboard letters used in the old derivation path
  const derivationKeyboardConfig = useMemo(() => {
    const qSnap = proof?.questionSnapshot ?? proof?.snapshot ?? proof?.question_snapshot
    const rawKey =
      proof?.symbolizationKey ??
      proof?.snapshot?.symbolizationKey ??
      proof?.question_snapshot?.symbolizationKey ??
      qSnap?.symbolizationKey ??
      qSnap?.symbolization_key
    const key = Array.isArray(rawKey) ? rawKey : []
    const conclusion = proof?.conclusion ?? proof?.conc ?? ''
    const formulaText = [...premises, conclusion].filter(Boolean).map(String).join(' ')
    const predicateMode = isPredicateLogicKey(key) || /[∀∃]/.test(formulaText)

    if (predicateMode) {
      const keyText = key.map((line) => (typeof line === 'string' ? line : String(line ?? ''))).join(' ')
      const textForConstants = [formulaText, keyText].filter(Boolean).join(' ') || ''
      const constantLetters = getConstantLettersFromPrompt(textForConstants, 3)
      const fromKey = getPredicateLettersFromKey(key)
      const fromFormulas = getPropositionalLettersFromFormulas(premises, conclusion) ?? []
      const predicateLetters = fromKey.length > 0 ? fromKey : fromFormulas
      return {
        isPredicateMode: true,
        predicateLetters,
        constantLetters,
        variableLetters: PREDICATE_VARIABLES,
      }
    }

    return {
      isPredicateMode: false,
      symbolizationKey: getPropositionalLettersFromFormulas(premises, conclusion) ?? [],
    }
  }, [premises, proof])
  const isLineCompleteForCheck = useCallback((line) => {
    if (!line) return false
    const formulaFilled = (line.formula || '').trim().length > 0
    if (!formulaFilled) return false
    const { hasLines, hasRule } = getJustificationMeta(line.justification)
    if (!hasRule) return false
    const rule = getRuleFromJustification(line.justification).toUpperCase()
    if (rule === 'CP' || rule === 'IP') {
      const { ranges } = justParse(String(line.justification || ''))
      return ranges.length > 0
    }
    if (hasLines) return true
    if (!rule) return false
    return RULES_ALLOW_NO_LINES.has(rule)
  }, [])
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = window.sessionStorage.getItem(AUTO_CHECK_STORAGE_KEY)
    if (saved === null) return true
    return saved === 'true'
  })
  const [autoCheckState, setAutoCheckState] = useState({ perLine: {}, rows: [] })
  const autoCheckTimerRef = useRef(null)
  const [lineGateNotice, setLineGateNotice] = useState({ index: null, message: '', tone: 'error' })
  const clearLineGateNotice = useCallback(() => {
    setLineGateNotice({ index: null, message: '', tone: 'error' })
  }, [])
  const setLineGateErrorNotice = useCallback((index, message) => {
    setLineGateNotice({ index, message, tone: 'error' })
  }, [])
  const setLineGateSuccessNotice = useCallback((index, message) => {
    setLineGateNotice({ index, message, tone: 'success' })
  }, [])
  const [lineDrafts, setLineDrafts] = useState({})
  const pendingFocusRef = useRef(null)
  const effectiveLines = useMemo(
    () =>
      lines.map((line, idx) => {
        if (!useRuleDropdown || !(idx in lineDrafts)) return line
        return {
          ...line,
          // Keep indentation/reactivity in sync while line(s) drafts are being edited.
          justification: applyLinesToJustification(line.justification, lineDrafts[idx]),
        }
      }),
    [lineDrafts, lines, useRuleDropdown]
  )
  const indentLevels = useMemo(() => {
    let level = 0
    return effectiveLines.map((line) => {
      const rule = getRuleFromJustification(line.justification).toUpperCase()
      if (INDENT_END_RULES.has(rule)) {
        level = Math.max(0, level - 1)
      }
      if (INDENT_START_RULES.has(rule)) {
        level = Math.min(level + 1, MAX_INDENT_LEVEL)
      }
      return level
    })
  }, [effectiveLines])

  const normalizeFormulaForCheck = useMemo(
    () => (value) => {
      const fixed = syntax.inputfix(String(value ?? '')).replace(/\s+/g, '')
      return fixed
        .replace(/([≡⊃∨•])/g, ' $1 ')
        .replace(/\s+/g, ' ')
        .trim()
    },
    [syntax]
  )
  const normalizeJustificationForCheck = useMemo(
    () => (value) => String(value ?? '').replace(/\s+/g, ''),
    []
  )
  const normalizeJustificationForSave = useCallback((value) => String(value ?? '').trim(), [])

  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  // focus input in full-screen overlay when opened from tapping an input on mobile
  useEffect(() => {
    if (!isFullScreen || initialFocusLineIndex == null || !initialFocusField) return
    const el =
      initialFocusField === 'formula'
        ? formulaRefs.current[initialFocusLineIndex]
        : justRefs.current[initialFocusLineIndex]
    if (el && typeof el.focus === 'function') {
      const t = setTimeout(() => el.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [isFullScreen, initialFocusLineIndex, initialFocusField])

  const emitState = useCallback((linesSnapshot) => {
    const submission = buildSubmission(
      linesSnapshot,
      proof?.conclusion,
      premises,
      normalizeFormulaForCheck,
      normalizeJustificationForSave
    )
    queueMicrotask(() => {
      onStateChangeRef.current?.(submission)
    })
  }, [premises, proof?.conclusion, normalizeFormulaForCheck, normalizeJustificationForSave])

  const runAutoCheck = useCallback(async (linesSnapshot) => {
    return runDerivationAutoCheck({
      isLineCompleteForCheck,
      linesSnapshot,
      normalizeFormulaForCheck,
      normalizeJustificationForCheck,
      premises,
      proof,
    })
  }, [normalizeFormulaForCheck, normalizeJustificationForCheck, premises, proof?.conclusion, proof?.options, proof?.ruleset, isLineCompleteForCheck])

  useEffect(() => {
    if (!autoCheckEnabled) {
      setAutoCheckState({ perLine: {}, rows: [] })
      return
    }
    if (autoCheckTimerRef.current) {
      clearTimeout(autoCheckTimerRef.current)
    }
    autoCheckTimerRef.current = setTimeout(async () => {
      try {
        const result = await runAutoCheck(lines)
        setAutoCheckState({ perLine: result.perLine, rows: result.rows })
        if (result.shouldAutoAdd) {
          setLines((prev) => {
            if (prev.length !== lines.length) return prev
            const last = prev[prev.length - 1]
            if (!last || last.readOnly || !isLineCompleteForCheck(last)) return prev
            const conclusionStr = proof?.conclusion || ''
            if (!conclusionStr) return prev
            if (formulasEqualNormally(last.formula || '', conclusionStr, normalizeFormulaForCheck)) return prev
            pendingFocusRef.current = prev.length
            return [...prev, { formula: '', justification: '', readOnly: false }]
          })
        }
      } catch (err) {
        setAutoCheckState({ perLine: {}, rows: [{ line: '', entries: [{ label: 'Autocheck', messages: ['Autocheck failed.'], isWarning: true }] }] })
      }
    }, 250)
    return () => {
      if (autoCheckTimerRef.current) {
        clearTimeout(autoCheckTimerRef.current)
      }
    }
  }, [autoCheckEnabled, lines, runAutoCheck])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(AUTO_CHECK_STORAGE_KEY, String(autoCheckEnabled))
  }, [autoCheckEnabled])

  const derivationLooksGood = useMemo(() => {
    return deriveDerivationLooksGood({
      autoCheckEnabled,
      autoCheckPerLine: autoCheckState.perLine,
      isLineCompleteForCheck,
      lines,
      normalizeFormulaForCheck,
      premises,
      proof,
    })
  }, [autoCheckEnabled, autoCheckState.perLine, isLineCompleteForCheck, lines, normalizeFormulaForCheck, premises, proof])

  useEffect(() => {
    if (derivationLooksGood.ok) {
      if (
        lineGateNotice.tone !== 'success' ||
        lineGateNotice.message !== 'Derivation looks good.' ||
        lineGateNotice.index !== derivationLooksGood.index
      ) {
        setLineGateSuccessNotice(derivationLooksGood.index, 'Derivation looks good.')
      }
      return
    }
    if (lineGateNotice.tone === 'success') {
      clearLineGateNotice()
    }
  }, [clearLineGateNotice, derivationLooksGood, lineGateNotice.index, lineGateNotice.message, lineGateNotice.tone, setLineGateSuccessNotice])

  const applyLineChange = (currentLines, index, field, value) =>
    currentLines.map((line, idx) =>
      idx === index ? { ...line, [field]: value } : line
    )

  const handleLineChange = (index, field, value) => {
    setLines((prev) => applyLineChange(prev, index, field, value))
    if (lineGateNotice.index === index) {
      clearLineGateNotice()
    }
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
    commitLines(
      (prev) => applyLineChange(prev, index, field, value),
      index
    )
  }

  // click row number to append it to current line's line(s) field (with space after)
  const handleRowNumberClick = useCallback(
    (clickedLineNum) => {
      const targetIdx = activeFormulaIndex ?? lastEditableIndexRef.current ?? premises.length
      if (targetIdx < premises.length) return
      commitLines((prev) => {
        const line = prev[targetIdx]
        if (!line) return prev
        const { nums, ranges, citedrules } = justParse(String(line.justification || ''))
        const hasLineNum = nums.includes(clickedLineNum)
        const nextNums = hasLineNum
          ? nums.filter((n) => n !== clickedLineNum)
          : [...nums, clickedLineNum]
        const newNums = [...new Set(nextNums)].sort((a, b) => a - b)
        const newJust = formatJustificationParts(newNums, ranges, citedrules)
        return applyLineChange(prev, targetIdx, 'justification', newJust)
      })
      setLineDrafts((prev) => {
        if (!(targetIdx in prev)) return prev
        const next = { ...prev }
        delete next[targetIdx]
        return next
      })
    },
    [activeFormulaIndex, premises.length, commitLines]
  )

  const canAddLine = useMemo(() => {
    if (!autoCheckEnabled) return true
    const last = lines[lines.length - 1]
    if (!last || last.readOnly) return true
    if (!isLineCompleteForCheck(last)) return false
    return autoCheckState.perLine[lines.length - 1] === 'ok'
  }, [autoCheckEnabled, lines, autoCheckState.perLine, isLineCompleteForCheck])

  const addLine = () => {
    if (autoCheckEnabled && !canAddLine) {
      setLineGateErrorNotice(lines.length - 1, 'Re-check current line to move onto the next line.')
      return
    }
    const nextIndex = lines.length
    setLines((prev) => [...prev, { formula: '', justification: '', readOnly: false }])
    pendingFocusRef.current = nextIndex
  }

  const deleteLine = (index) => {
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
    formulaRefs.current = {}
    justRefs.current = {}
    cursorPositionsRef.current = {}
  }

  const focusFormula = (index) => {
    const el = formulaRefs.current[index]
    if (el && typeof el.focus === 'function') {
      el.focus()
    }
  }

  const focusJustification = (index) => {
    const el = justRefs.current[index]
    if (el && typeof el.focus === 'function') {
      el.focus()
    }
  }

  const setStoredSelection = (index, start, end = start) => {
    cursorPositionsRef.current[index] = { start, end }
  }

  const getStoredSelection = (index, fallbackLength) => {
    const stored = cursorPositionsRef.current[index]
    if (stored && typeof stored === 'object' && typeof stored.start === 'number') {
      return {
        start: stored.start,
        end: typeof stored.end === 'number' ? stored.end : stored.start,
      }
    }
    if (typeof stored === 'number') {
      return { start: stored, end: stored }
    }
    return { start: fallbackLength, end: fallbackLength }
  }

  const updateCursorPosition = (index, event) => {
    const target = event?.target
    if (target && typeof target.selectionStart === 'number') {
      const start = target.selectionStart
      const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start
      setStoredSelection(index, start, end)
    }
  }

  const resolveEditableIndex = () => {
    if (activeFormulaIndex !== null && !lines[activeFormulaIndex]?.readOnly) {
      return activeFormulaIndex
    }
    if (lastEditableIndexRef.current !== null && !lines[lastEditableIndexRef.current]?.readOnly) {
      return lastEditableIndexRef.current
    }
    const fallback = lines.findIndex((line) => !line.readOnly)
    return fallback >= 0 ? fallback : null
  }

  const handleFormulaKeyDown = (event, index, readOnly) => {
    handleDerivationFormulaKeyDown({
      event,
      focusJustification,
      getStoredSelection,
      handleLineChange,
      handleLineCommit,
      index,
      normalizeFormulaForCheck,
      readOnly,
      setStoredSelection,
    })
  }

  const handleJustKeyDown = async (event, index, readOnly) => {
    await handleDerivationJustificationKeyDown({
      addLine,
      autoCheckEnabled,
      emitState,
      event,
      focusFormula,
      index,
      lines,
      readOnly,
      runAutoCheck,
      setAutoCheckState,
      setLineDrafts,
      setLineGateErrorNotice,
      setLines,
    })
  }

  const handleStartOver = () => {
    if (isLocked || isAssignmentLocked) return
    const premLines = premises.map((p) => ({ formula: p, justification: '', readOnly: true }))
    const blanks = Array.from({ length: 1 }, () => ({ formula: '', justification: '', readOnly: false }))
    const nextLines = [...premLines, ...blanks]
    setLines(nextLines)
    setLastSubmitStatus(null)
    setStatusBanner({ status: 'unanswered', message: '' })
    emitState(nextLines)
  }

  const hasStartedLine = lines.some((line) => (
    !line.readOnly && (
      String(line.formula || '').trim() ||
      String(line.justification || '').trim()
    )
  ))

  const handleSubmit = async () => {
    if (isAssignmentLocked) return
    if (!hasStartedLine) return
    setIsChecking(true)
    try {
      await submitDerivationAnswer({
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
      })
    } catch (err) {
      setStatusBanner({ status: 'malfunction', message: 'Error submitting answer' })
      setLastSubmitStatus(null)
    } finally {
      setIsChecking(false)
    }
  }

  const isLocked = Number.isFinite(attemptLimit) && attemptCount >= attemptLimit
  const submitDisabled = isLocked || isAssignmentLocked || !hasStartedLine

  const handleSymbolInsert = ({ insert, pair }) => {
    const targetIdx = resolveEditableIndex()
    if (targetIdx === -1 || targetIdx === null) return
    const inputEl = formulaRefs.current[targetIdx]
    const current = lines[targetIdx]?.formula || ''
    const stored = getStoredSelection(targetIdx, current.length)
    const isFocused = typeof document !== 'undefined' && document.activeElement === inputEl
    const start = isFocused && typeof inputEl?.selectionStart === 'number' ? inputEl.selectionStart : stored.start
    const end = isFocused && typeof inputEl?.selectionEnd === 'number' ? inputEl.selectionEnd : stored.end
    const hasSelection = end > start
    const [open, close] = pair ? pair.split('') : []
    const insertText = pair
      ? (hasSelection ? `${open}${current.slice(start, end)}${close}` : `${open}  ${close}`)
      : insert
    if (!insertText) return
    const nextCursor = pair
      ? (hasSelection ? start + insertText.length : start + open.length + 1)
      : start + insertText.length
    if (inputEl && typeof inputEl.setRangeText === 'function') {
      inputEl.setRangeText(insertText, start, end, 'end')
      handleLineChange(targetIdx, 'formula', inputEl.value ?? '')
      inputEl.focus()
      setStoredSelection(targetIdx, nextCursor)
      setTimeout(() => inputEl.setSelectionRange(nextCursor, nextCursor), 0)
      return
    }
    const before = current.slice(0, start)
    const after = current.slice(end)
    const nextValue = `${before}${insertText}${after}`
    handleLineChange(targetIdx, 'formula', nextValue)
    setStoredSelection(targetIdx, nextCursor)
    if (inputEl) {
      inputEl.focus()
      setTimeout(() => inputEl.setSelectionRange(nextCursor, nextCursor), 0)
    }
  }

  // open fullscreen when user taps an input on the table. phones only (not tablets).
  const canOpenFullScreen = isPhone && !isFullScreen && typeof onOpenFullScreen === 'function'

  const handleInputRequestFullScreen = useCallback(
    (lineIndex, field) => {
      if (!canOpenFullScreen) return
      onOpenFullScreen({ lineIndex, field })
    },
    [canOpenFullScreen, onOpenFullScreen]
  )

  return (
    <Stack
      spacing={2}
      sx={
        isFullScreen
          ? {
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              width: '100%',
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }
          : undefined
      }
    >
      {(() => {
        return (
          <DerivationWorkspace
            allowedRules={allowedRules}
            canOpenFullScreen={canOpenFullScreen}
            feedbackNode={(
              <DerivationFeedbackPanel
                autoCheckEnabled={autoCheckEnabled}
                autoCheckRows={autoCheckState.rows}
                isFullScreen={isFullScreen}
                lineGateNotice={lineGateNotice}
              />
            )}
            handleRuleInputModeChange={handleRuleInputModeChange}
            isFullScreen={isFullScreen}
            isInstructorView={isInstructorView}
            isMobile={isMobile}
            isPhone={isPhone}
            onEditQuestion={onEditQuestion}
            onOpenFullScreen={onOpenFullScreen}
            problemLabel={problemLabel}
            prompt={proof.description}
            ruleInputMode={ruleInputMode}
          >
            <DerivationTableRows
              activeFormulaIndex={activeFormulaIndex}
              allowedRules={allowedRules}
              autoCheckEnabled={autoCheckEnabled}
              autoCheckState={autoCheckState}
              canOpenFullScreen={canOpenFullScreen}
              commitLines={commitLines}
              deleteLine={deleteLine}
              derivationKeyboardConfig={derivationKeyboardConfig}
              formulaRefs={formulaRefs}
              getStoredSelection={getStoredSelection}
              handleFormulaKeyDown={handleFormulaKeyDown}
              handleInputRequestFullScreen={handleInputRequestFullScreen}
              handleJustKeyDown={handleJustKeyDown}
              handleLineChange={handleLineChange}
              handleLineCommit={handleLineCommit}
              handleRowNumberClick={handleRowNumberClick}
              handleSymbolInsert={handleSymbolInsert}
              indentLevels={indentLevels}
              initialFocusField={initialFocusField}
              inputUnderlineSx={getInputUnderlineSx}
              isFullScreen={isFullScreen}
              isMobile={isMobile}
              isPhone={isPhone}
              justRefs={justRefs}
              lineDrafts={lineDrafts}
              lines={lines}
              normalizeFormulaForCheck={normalizeFormulaForCheck}
              pendingFocusRef={pendingFocusRef}
              plainNumberCellSx={{ width: isFullScreen || isMobile ? 36 : 48, minWidth: isFullScreen || isMobile ? 36 : undefined, borderBottom: 'none', verticalAlign: 'middle', ...(isFullScreen && { pr: 1 }) }}
              proof={proof}
              premises={premises}
              selectUnderlineSx={getSelectUnderlineSx}
              setActiveFormulaIndex={setActiveFormulaIndex}
              setLineDrafts={setLineDrafts}
              updateCursorPosition={updateCursorPosition}
              useRuleDropdown={useRuleDropdown}
            />
            <DerivationToolbarRow
              addLine={addLine}
              autoCheckEnabled={autoCheckEnabled}
              canAddLine={canAddLine}
              handleSymbolInsert={handleSymbolInsert}
              isFullScreen={isFullScreen}
              isMobile={isMobile}
              isPhone={isPhone}
              setAutoCheckEnabled={setAutoCheckEnabled}
            />
          </DerivationWorkspace>
        )
      })()}
      {/* fullscreen: sticky button row at bottom; non-fullscreen: normal flow */}
      {!hideActions && (
        <Box
          sx={{
            mt: 1,
            ...(isFullScreen && {
              flexShrink: 0,
              pl: 2,
              pr: 0,
              pt: 1.5,
              pb: 2,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
            }),
          }}
        >
          <ProblemSetButtons
            onCheck={handleSubmit}
            onStartOver={handleStartOver}
            isChecking={isChecking}
            isDisabled={submitDisabled}
            align="flex-start"
            attemptCount={attemptCount}
            attemptLimit={attemptLimit}
            sx={{ mt: 1 }}
            scoreLabel={isPhone && isFullScreen && Number.isFinite(totalQuestions) && totalQuestions > 0 ? (() => {
              const pointsPerQuestion = 100 / totalQuestions
              const maxLabel = pointsPerQuestion % 1 === 0 ? String(Math.round(pointsPerQuestion)) : pointsPerQuestion.toFixed(1)
              const isLockedOut = Number.isFinite(attemptLimit) && attemptCount >= attemptLimit
              const score = currentQuestionScore != null && Number.isFinite(Number(currentQuestionScore)) ? Number(currentQuestionScore) : null
              if (score != null) {
                const earned = (score / 100) * pointsPerQuestion
                const earnedLabel = earned % 1 === 0 ? String(Math.round(earned)) : earned.toFixed(1)
                const color = score >= 100 ? 'success.main' : score > 0 ? 'text.secondary' : 'error.main'
                return { text: `${earnedLabel}/${maxLabel}`, color }
              }
              if (lastSubmitStatus === 'correct') return { text: `${maxLabel}/${maxLabel}`, color: 'success.main' }
              if (lastSubmitStatus === 'incorrect') return { text: `0/${maxLabel}`, color: 'error.main' }
              if (isCurrentCorrect) return { text: `${maxLabel}/${maxLabel}`, color: 'success.main' }
              if (isLockedOut) return { text: `0/${maxLabel}`, color: 'error.main' }
              return null
            })() : null}
          />
        </Box>
      )}
    </Stack>
  )
}
