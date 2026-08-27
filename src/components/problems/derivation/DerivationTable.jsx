import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { alpha } from '@mui/material/styles'
import PromptText from '../../ui/PromptText.jsx'
import ThemedCard from '../../ui/ThemedCard.jsx'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import { useMobileLogicKeyboardEnabled } from '../../ui/LogicKeyboard/index.js'
import { getDerivationCheckerForLogicSystem } from '../../../lib/logicpenguin/checkers/derivation-by-logic-system.js'
import { canonicalizeFormula } from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
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
import { getRulesetRestrictions } from '../../../lib/logicpenguin/checkers/derivation-rule-restrictions.js'
import { justParse } from '../../ui/logicpenguin/justification-parse.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'
import { logicStatementsToTex } from '../../../lib/logicTex.js'
import { buildPersistedSubmissionState, shouldUseApiValidation, submitApiValidation } from '../../../utils/submissionRuntime.js'
import {
  FITCH_ASSUMPTION_RULES,
  HURLEY_ASSUMPTION_RULES,
  INDENT_END_RULES,
  MOBILE_DERIVATION_PLACEHOLDER_MSG,
  PREDICATE_VARIABLES,
  applyLinesToJustification,
  applyRuleToJustification,
  buildSubmission,
  extractLines,
  formatJustificationDisplay,
  formatJustificationParts,
  getConstantLettersFromFormulasAndKey,
  getConstantLettersFromPrompt,
  getJustificationMeta,
  getOpenAssumptionDepths,
  getPredicateLettersFromKey,
  getPropositionalLettersFromFormulas,
  getRuleFromJustification,
  isDerivationFieldReadOnly,
  isPredicateLogicKey,
  normalizeJustificationForDisplay,
} from './derivationUtils.js'
import {
  DERIVATION_FORMULA_MIN_WIDTH,
  DERIVATION_FORMULA_WIDTH,
  DERIVATION_NUMBER_CELL_WIDTH_DESKTOP,
  DERIVATION_NUMBER_CELL_WIDTH_MOBILE,
  FITCH_LINE_WIDTH,
  RULE_INPUT_MODE_KEY,
  applyInsertion,
  getDerivationScoreLabel,
  getFitchLineColor,
  getQuantifierButtonsFromFormulas,
  getSymbolButtons,
  parseRulesetRules,
} from './derivationTableConfig.js'
import DerivationFormulaText from './DerivationFormulaText.jsx'
import DerivationFeedbackPanel from './DerivationFeedbackPanel.jsx'
import DerivationFormulaCell from './DerivationFormulaCell.jsx'
import DerivationHeader from './DerivationHeader.jsx'
import DerivationJustificationCell from './DerivationJustificationCell.jsx'
import DerivationKeyboardRow from './DerivationKeyboardRow.jsx'
import useDerivationAutoCheck from './useDerivationAutoCheck.js'

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
  hideActions = false,
  fixedLines = null,
}) {
  const formulaRefs = useRef({})
  const justRefs = useRef({})
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
    return (question, givenans, points, options) =>
      checker(question, null, givenans, false, points, true, options)
  }, [activeLogicSystem])
  const allDerivationRules = getDerivationRules(activeLogicSystem)
  const derivationRuleLookup = getDerivationRuleLookup(activeLogicSystem)
  const [activeFormulaIndex, setActiveFormulaIndex] = useState(null)
  const activeKeyboardFormulaIndexRef = useRef(null)
  const lastFormulaIndexRef = useRef(null)
  const lastEditableIndexRef = useRef(null)
  const cursorPositionsRef = useRef({})
  const syntax = useMemo(() => getSyntax(notation), [notation])
  const normalizeFormulaForCheck = useCallback(
    (value) => canonicalizeFormula(value, notation),
    [notation]
  )
  const normalizeFormulaForDisplay = useCallback(
    (value) => {
      const raw = String(value ?? '')
      if (/[-–]$/.test(raw)) {
        const fixed = syntax.inputfix(raw.slice(0, -1)).replace(/\s+$/g, '') + raw.slice(-1)
        return displayIndexedSymbolsForNotation(fixed, notation)
      }
      return displayIndexedSymbolsForNotation(syntax.inputfix(raw), notation)
    },
    [notation, syntax]
  )
  const premises = useMemo(
    () => (Array.isArray(proof?.premises) ? proof.premises : []),
    [proof?.premises]
  )
  const normalizedFixedLines = useMemo(() => (
    Array.isArray(fixedLines)
      ? fixedLines.map((line) => ({
          formula: normalizeFormulaForDisplay(normalizeFormulaForCheck(line.formula)),
          justification: String(line.justification ?? '').trim(),
          scopeDepth: Number.isInteger(line.scopeDepth) ? line.scopeDepth : null,
          startsScope: line.startsScope === true,
          requiredRules: Array.isArray(line.requiredRules) ? line.requiredRules : null,
        }))
      : null
  ), [fixedLines, normalizeFormulaForCheck, normalizeFormulaForDisplay])
  const isFixedProof = normalizedFixedLines !== null
  const usesFixedScopeNesting = isFixedProof && usesNestedSubderivations
  const normalizedConclusion = proof?.conclusion
    ? normalizeFormulaForDisplay(normalizeFormulaForCheck(proof.conclusion))
    : ''
  const conclusionTargetText = normalizedConclusion
    ? `// ${normalizedConclusion}`
    : ''
  const normalizedPremises = premises.map((premise) => (
    normalizeFormulaForDisplay(normalizeFormulaForCheck(premise))
  ))
  const argumentTarget = !isFixedProof && usesNestedSubderivations && normalizedConclusion
    ? {
        text: `${normalizedPremises.join(', ')}${normalizedPremises.length ? ' ' : ''}∴ ${normalizedConclusion}`,
        tex: logicStatementsToTex([...normalizedPremises, normalizedConclusion], true),
      }
    : null
  const buildFreshLines = useCallback((restoredLines = []) => {
    const premiseLines = premises.map((premise) => ({
      formula: normalizeFormulaForDisplay(normalizeFormulaForCheck(premise)),
      justification: '',
      readOnly: true,
    }))
    if (normalizedFixedLines) {
      return [
        ...premiseLines,
        ...normalizedFixedLines.map((line, index) => ({
          formula: line.formula,
          justification: line.justification
            || restoredLines[premises.length + index]?.justification
            || '',
          readOnly: false,
          formulaReadOnly: true,
          justificationReadOnly: Boolean(line.justification),
          scopeDepth: line.scopeDepth,
          startsScope: line.startsScope,
          requiredRules: line.requiredRules,
        })),
      ]
    }
    return [
      ...premiseLines,
      { formula: '', justification: '', readOnly: false },
    ]
  }, [normalizeFormulaForCheck, normalizeFormulaForDisplay, normalizedFixedLines, premises])
  const initialLines = useMemo(() => {
    const fromState = extractLines(savedState, premises)
    if (isFixedProof) return buildFreshLines(fromState)
    if (fromState.length) {
      return fromState.map((line) => ({
        ...line,
        formula: normalizeFormulaForDisplay(normalizeFormulaForCheck(line.formula)),
      }))
    }
    return buildFreshLines()
  }, [buildFreshLines, isFixedProof, normalizeFormulaForCheck, normalizeFormulaForDisplay, savedState, premises])

  const [lines, setLines] = useState(initialLines)
  const [lastSubmitStatus, setLastSubmitStatus] = useState(null)
  const onStateChangeRef = useRef(onStateChange)
  const firstEditableIndex = premises.length

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

  /** Keyboard config for derivations.
   * - Predicate mode: three letter rows (predicates, constants, variables).
   * - Propositional mode: only propositional letters (no lowercase constants/variables, no quantifiers).
   */
  const derivationKeyboardConfig = useMemo(() => {
    const qSnap = proof?.questionSnapshot ?? proof?.snapshot ?? proof?.question_snapshot
    const rawKey =
      proof?.symbolizationKey ??
      proof?.snapshot?.symbolizationKey ??
      proof?.question_snapshot?.symbolizationKey ??
      qSnap?.symbolizationKey ??
      qSnap?.symbolization_key
    const key = Array.isArray(rawKey) ? rawKey : []
    const premises = Array.isArray(proof?.premises) ? proof.premises : []
    const conclusion = proof?.conclusion ?? proof?.conc ?? ''
    const formulaText = [...premises, conclusion].filter(Boolean).map(String).join(' ')
    const extraSymbolButtons = [
      { label: symbols.falsum, insert: symbols.falsum },
      ...(allowIndexedSymbols ? [{ label: 'x₂', insert: '_' }] : []),
      ...getQuantifierButtonsFromFormulas(premises, conclusion, syntax),
    ]

    const isPredicate = isPredicateLogicKey(key, allowIndexedSymbols) || /[∀∃]/.test(formulaText) || /[A-Z][a-z]/.test(formulaText) || /[A-Z](?:_[1-9][0-9]*|[₁-₉][₀-₉]*)?\s*\(/.test(formulaText)

    if (isPredicate) {
      const keyText = key.map((line) => (typeof line === 'string' ? line : String(line ?? ''))).join(' ')
      const textForConstants = [formulaText, keyText].filter(Boolean).join(' ') || ''
      const constantsFromAnswer = getConstantLettersFromFormulasAndKey(formulaText, key, allowIndexedSymbols)
      const constantLetters = [
        ...constantsFromAnswer,
        ...getConstantLettersFromPrompt(textForConstants, 3).filter((letter) => !constantsFromAnswer.includes(letter)),
      ]
      const variableLetters = PREDICATE_VARIABLES
      // Prefer predicate letters from the symbolization key; if missing, fall back to uppercase letters in formulas.
      const fromKey = getPredicateLettersFromKey(key, allowIndexedSymbols)
      const fromFormulas = getPropositionalLettersFromFormulas(
        premises,
        conclusion,
        allowIndexedSymbols
      ) ?? []
      const predicateLetters = fromKey.length > 0 ? fromKey : fromFormulas
      return {
        isPredicateMode: true,
        predicateLetters,
        constantLetters,
        variableLetters,
        extraSymbolButtons,
      }
    }

    // Propositional derivation: only show propositional letters (no lowercase rows, no quantifiers).
    const predicateLetters = getPropositionalLettersFromFormulas(
      premises,
      conclusion,
      allowIndexedSymbols
    ) ?? []
    return {
      isPredicateMode: false,
      symbolizationKey: predicateLetters,
      extraSymbolButtons,
    }
  }, [allowIndexedSymbols, proof, symbols.falsum, syntax])
  const symbolButtons = useMemo(() => {
    const baseSymbolButtons = getSymbolButtons(symbols, syntax)
    const extraSymbolButtons = derivationKeyboardConfig.extraSymbolButtons || []
    if (extraSymbolButtons.length === 0) return baseSymbolButtons
    return [
      ...baseSymbolButtons.slice(0, 7),
      ...extraSymbolButtons,
      ...baseSymbolButtons.slice(7),
    ]
  }, [derivationKeyboardConfig.extraSymbolButtons, symbols, syntax])
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
  const indentLevels = useMemo(() => {
    const inferred = getOpenAssumptionDepths(effectiveLines, {
      mode: usesNestedSubderivations ? 'nested' : 'flat',
      assumptionRules: activeAssumptionRules,
    })
    if (!isFixedProof) return inferred
    return effectiveLines.map((line, index) => (
      Number.isInteger(line.scopeDepth) ? line.scopeDepth : inferred[index]
    ))
  }, [activeAssumptionRules, effectiveLines, isFixedProof, usesNestedSubderivations])

  const normalizeJustification = useCallback((value) => String(value ?? '').trim(), [])

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

  const emitState = useCallback((linesSnapshot, options = {}) => {
    const submission = buildSubmission(
      linesSnapshot,
      proof?.conclusion,
      premises,
      normalizeFormulaForCheck,
      normalizeJustification,
      {
        nestedSubderivations: usesNestedSubderivations,
        assumptionRules: activeAssumptionRules,
        canonicalScopes: usesFixedScopeNesting,
      }
    )
    if (options.immediate) {
      return onStateChangeRef.current?.(submission, options)
    }
    queueMicrotask(() => {
      onStateChangeRef.current?.(submission, options)
    })
  }, [activeAssumptionRules, premises, proof?.conclusion, normalizeFormulaForCheck, normalizeJustification, usesFixedScopeNesting, usesNestedSubderivations])

  const {
    autoCheckEnabled,
    autoCheckState,
    clearLineGateNotice,
    lineGateNotice,
    setAutoCheckEnabled,
    setAutoCheckState,
    setLineGateErrorNotice,
  } = useDerivationAutoCheck({
    activeAssumptionRules,
    checkDerivation,
    isLineComplete: isLineCompleteForCheck,
    lines,
    normalizeFormula: normalizeFormulaForCheck,
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

  const handleFormulaChange = (event, index) => {
    if (isDerivationFieldReadOnly(lines[index], 'formula')) return
    const el = event.target
    const raw = el?.value ?? ''
    const inputType = event.nativeEvent?.inputType ?? ''
    // Do not restore operator padding that the user is trying to erase.
    const normalized = inputType.startsWith('delete')
      ? raw
      : normalizeFormulaForDisplay(raw)
    handleLineChange(index, 'formula', normalized)
    if (normalized === raw || typeof el?.selectionStart !== 'number') return
    const nextCursor = normalizeFormulaForDisplay(raw.slice(0, el.selectionStart)).length
    setStoredSelection(index, nextCursor)
    window.setTimeout(() => {
      if (formulaRefs.current[index] && typeof formulaRefs.current[index].setSelectionRange === 'function') {
        formulaRefs.current[index].setSelectionRange(nextCursor, nextCursor)
      }
    }, 0)
  }

  const handleJustificationChange = (event, index) => {
    if (isDerivationFieldReadOnly(lines[index], 'justification')) return
    const el = event.target
    const raw = el?.value ?? ''
    const normalized = normalizeJustificationForDisplay(raw)
    handleLineChange(index, 'justification', normalized)
    if (normalized === raw || typeof el?.selectionStart !== 'number') return
    const nextCursor = normalizeJustificationForDisplay(raw.slice(0, el.selectionStart)).length
    setStoredSelection(index, nextCursor)
    window.setTimeout(() => {
      if (justRefs.current[index] && typeof justRefs.current[index].setSelectionRange === 'function') {
        justRefs.current[index].setSelectionRange(nextCursor, nextCursor)
      }
    }, 0)
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
    if (isDerivationFieldReadOnly(line, 'justification')) return
    setLineDrafts((previous) => ({ ...previous, [index]: raw }))
    handleLineChange(index, 'justification', applyLinesToJustification(line.justification, raw, {
      rulesFirst: usesNestedSubderivations,
    }))
  }

  const handleCitationCommit = (index, line, raw) => {
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
    if (isDerivationFieldReadOnly(line, 'justification')) return
    const upperRule = selectedRule.toUpperCase()
    const currentJustification = index in lineDrafts
      ? applyLinesToJustification(line.justification, lineDrafts[index], {
        rulesFirst: usesNestedSubderivations,
      })
      : line.justification
    const nextValue = activeAssumptionRules.has(upperRule)
      ? applyRuleToJustification('', selectedRule, { rulesFirst: usesNestedSubderivations })
      : applyRuleToJustification(currentJustification, selectedRule, {
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
      window.setTimeout(() => justRefs.current[index]?.focus(), 0)
    }
  }

  // click row number to append it to current line's line(s) field (with space after)
  const handleRowNumberClick = useCallback(
    (clickedLineNum) => {
      const targetIdx =
        activeFormulaIndex
        ?? activeKeyboardFormulaIndexRef.current
        ?? lastFormulaIndexRef.current
        ?? premises.length
      if (targetIdx < premises.length) return
      commitLines((prev) => {
        const line = prev[targetIdx]
        if (isDerivationFieldReadOnly(line, 'justification')) return prev
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
      setLineDrafts((prev) => {
        if (!(targetIdx in prev)) return prev
        const next = { ...prev }
        delete next[targetIdx]
        return next
      })
    },
    [activeFormulaIndex, premises.length, commitLines, usesNestedSubderivations]
  )

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
      setLineGateErrorNotice(lines.length - 1, 'Re-check current line to move onto the next line.')
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
    let targetIndex = index
    while (
      targetIndex < lines.length
      && isDerivationFieldReadOnly(lines[targetIndex], 'justification')
    ) {
      targetIndex += 1
    }
    const el = justRefs.current[targetIndex]
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
    if (activeFormulaIndex !== null && !isDerivationFieldReadOnly(lines[activeFormulaIndex], 'formula')) {
      return activeFormulaIndex
    }
    if (lastEditableIndexRef.current !== null
      && !isDerivationFieldReadOnly(lines[lastEditableIndexRef.current], 'formula')) {
      return lastEditableIndexRef.current
    }
    const fallback = lines.findIndex((line) => !isDerivationFieldReadOnly(line, 'formula'))
    return fallback >= 0 ? fallback : null
  }

  const resolveActiveInputTarget = () => {
    if (typeof document !== 'undefined') {
      const activeElement = document.activeElement
      for (const [index, el] of Object.entries(justRefs.current)) {
        if (el && activeElement === el
          && !isDerivationFieldReadOnly(lines[Number(index)], 'justification')) {
          return { field: 'justification', index: Number(index) }
        }
      }
      for (const [index, el] of Object.entries(formulaRefs.current)) {
        if (el && activeElement === el
          && !isDerivationFieldReadOnly(lines[Number(index)], 'formula')) {
          return { field: 'formula', index: Number(index) }
        }
      }
    }
    const fallbackIndex = resolveEditableIndex()
    return fallbackIndex === null || fallbackIndex === -1
      ? null
      : { field: 'formula', index: fallbackIndex }
  }

  const handleFormulaKeyDown = (event, index) => {
    if (isDerivationFieldReadOnly(lines[index], 'formula')) return
    const el = event.target
    if (!el) return
    if (event.key === 'Enter') {
      event.preventDefault()
      const normalized = normalizeFormulaForCheck(el.value)
      handleLineCommit(index, 'formula', normalized)
      focusJustification(index)
      return
    }
    if (event.key === 'ArrowRight' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const len = (el.value ?? '').length
      const selEnd = typeof el.selectionEnd === 'number' ? el.selectionEnd : getStoredSelection(index, len).end
      if (selEnd >= len) {
        event.preventDefault()
        focusJustification(index)
      }
      return
    }
    const key = event.key
    const value = el.value ?? ''
    const stored = getStoredSelection(index, value.length)
    const start = typeof el.selectionStart === 'number' ? el.selectionStart : stored.start
    const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : stored.end
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey

    const insertSymbol = (symbol, replaceBefore = 0) => {
      event.preventDefault()
      const caret = start
      if (typeof el.setRangeText === 'function') {
        const replaceStart = Math.max(0, start - replaceBefore)
        const replaceEnd = end
        el.setRangeText(symbol, replaceStart, replaceEnd, 'end')
        const nextValue = el.value ?? ''
        handleLineChange(index, 'formula', nextValue)
        const nextCursor = Math.max(0, caret - replaceBefore) + symbol.length
        setStoredSelection(index, nextCursor)
        setTimeout(() => el.setSelectionRange(nextCursor, nextCursor), 0)
        return
      }
      const { nextValue, nextCursor } = applyInsertion(value, start, end, symbol, replaceBefore)
      handleLineChange(index, 'formula', nextValue)
      setStoredSelection(index, nextCursor)
      setTimeout(() => el.setSelectionRange(nextCursor, nextCursor), 0)
    }

    if (!hasModifier && (key === '&' || key === '^' || key === '.' || key === '*' || key === '•' || key === '·' || key === '∧')) {
      insertSymbol(symbols.and)
      return
    }
    if (!hasModifier && (key === 'v' || key === '∨')) {
      insertSymbol('∨')
      return
    }
    if (!hasModifier && (key === '>' || key === '→' || key === '⇒' || key === '⊃')) {
      const hyphenMatch = value.slice(0, start).match(/-+$/)
      const replaceBefore = hyphenMatch ? hyphenMatch[0].length : 0
      insertSymbol(symbols.conditional, replaceBefore)
      return
    }
    if (!hasModifier && key === '=' && start > 0 && value[start - 1] === '=') {
      insertSymbol(symbols.biconditional, 1)
      return
    }
    if (!hasModifier && (key === 'l' || key === 'L')) {
      const textWithKey = value.slice(0, start) + key.toLowerCase()
      if (/all$/i.test(textWithKey)) {
        insertSymbol('∀', 2) // replace only 'al' so ~all → ~∀
      }
      return
    }
    if (!hasModifier && (key === 'e' || key === 'E')) {
      const textWithKey = value.slice(0, start) + key.toLowerCase()
      if (/some$/i.test(textWithKey)) {
        insertSymbol('∃', 3) // replace only 'som' so ~some → ~∃
      }
    }
  }

  const handleJustKeyDown = async (event, index) => {
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
      const formatted = applyLinesToJustification(lines[index]?.justification, event.target.value, {
        rulesFirst: usesNestedSubderivations,
      })
      const nextLines = applyLineChange(lines, index, 'justification', formatted)
      setLines(nextLines)
      emitState(nextLines)
      setLineDrafts((prev) => {
        if (!(index in prev)) return prev
        const next = { ...prev }
        delete next[index]
        return next
      })
      if (autoCheckEnabled) {
        try {
          const result = await runAutoCheck(nextLines)
          setAutoCheckState(result)
          if (result.perLine[index] !== 'ok') {
            setLineGateErrorNotice(index, 'Re-check current line to move onto the next line.')
            return
          }
        } catch (err) {
          setLineGateErrorNotice(index, 'Re-check current line to move onto the next line.')
          return
        }
      }
      const nextIndex = index + 1
      if (isFixedProof && nextIndex >= lines.length) return
      if (nextIndex >= lines.length) {
        addLine()
        setTimeout(() => focusFormula(nextIndex), 0)
      } else {
        if (isFixedProof) {
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

  const hasStartedLine = lines.some((line) => (
    !line.readOnly && (
      String(line.justification || '').trim()
      || (!isFixedProof && String(line.formula || '').trim())
    )
  ))

  const handleSubmit = async () => {
    if (isAssignmentLocked) return
    if (!hasStartedLine) return
    setIsChecking(true)
    try {
      const submission_data = buildSubmission(
        lines,
        proof?.conclusion,
        premises,
        normalizeFormulaForCheck,
        normalizeJustification,
        {
          nestedSubderivations: usesNestedSubderivations,
          assumptionRules: activeAssumptionRules,
          canonicalScopes: usesFixedScopeNesting,
        }
      )
      if (!shouldUseApiValidation(proof?.questionId)) {
        const validation = await checkDerivation(
          { prems: premises, conc: proof?.conclusion, ruleset: proof?.ruleset },
          submission_data.ans,
          1,
          { ...(proof?.options || {}), notation }
        )
        const successstatus = validation?.successstatus || 'incorrect'
        const nextAttempt = attemptCount + 1
        setLastSubmitStatus(successstatus)
        setAttemptCount((prev) => prev + 1)
        onStateChangeRef.current?.(buildPersistedSubmissionState({
          answerState: submission_data,
          attemptCount: nextAttempt,
          status: successstatus,
          rawScore: successstatus === 'correct' ? 100 : 0,
        }))
        setStatusBanner({
          status: successstatus,
          message: validation?.message || validation?.transmessage || (successstatus === 'correct' ? 'Correct!' : 'Incorrect.'),
        })
        onAttempt?.({
          attempt: nextAttempt,
          attemptLimit,
        })
        if (successstatus === 'correct') {
          onProofComplete?.(proof.id)
        }
      } else {
        const submission = await submitApiValidation({
          assignmentQuestionId: proof?.questionId,
          submissionData: submission_data,
        })
        const { validation, successstatus, rawScore, attempt, attemptLimit: nextAttemptLimit } = submission
        setLastSubmitStatus(successstatus)
        if (typeof nextAttemptLimit === 'number') {
          setAttemptLimit(nextAttemptLimit)
        }
        const nextAttempt = attempt ?? attemptCount + 1
        setAttemptCount((prev) => attempt ?? prev + 1)
        onStateChangeRef.current?.(buildPersistedSubmissionState({
          answerState: submission_data,
          attemptCount: nextAttempt,
          status: successstatus,
          rawScore,
        }))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('assignment-submission', {
            detail: {
              assignmentQuestionId: proof?.questionId,
              attempt,
              attemptLimit: nextAttemptLimit,
              isCorrect: successstatus === 'correct',
              score: rawScore,
            },
          }))
        }
        setStatusBanner({
          status: successstatus,
          message: validation.message || validation.transmessage || (successstatus === 'correct' ? 'Correct!' : 'Incorrect.'),
        })
        onAttempt?.({
          attempt: nextAttempt,
          attemptLimit: nextAttemptLimit,
        })
        if (successstatus === 'correct') {
          onProofComplete?.(proof.id)
        }
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

  const handleSymbolInsert = ({ insert, pair }) => {
    const target = resolveActiveInputTarget()
    if (!target || target.index === -1 || target.index === null) return
    const targetIdx = target.index
    const field = target.field
    const inputEl = field === 'justification' ? justRefs.current[targetIdx] : formulaRefs.current[targetIdx]

    if (field === 'justification' && useRuleDropdown) {
      inputEl?.focus()
      return
    }

    const current = lines[targetIdx]?.[field] || ''
    const stored = getStoredSelection(targetIdx, current.length)
    const activeFacade = field === 'formula' && targetIdx === activeKeyboardFormulaIndexRef.current && inputEl
    const isFocused = typeof document !== 'undefined' && document.activeElement === inputEl
    const useInputSelection = activeFacade || isFocused
    const start = useInputSelection && typeof inputEl?.selectionStart === 'number' ? inputEl.selectionStart : stored.start
    const end = useInputSelection && typeof inputEl?.selectionEnd === 'number' ? inputEl.selectionEnd : stored.end
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
      handleLineChange(targetIdx, field, inputEl.value ?? '')
      inputEl.focus()
      setStoredSelection(targetIdx, nextCursor)
      setTimeout(() => inputEl.setSelectionRange(nextCursor, nextCursor), 0)
      return
    }
    const before = current.slice(0, start)
    const after = current.slice(end)
    const nextValue = `${before}${insertText}${after}`
    handleLineChange(targetIdx, field, nextValue)
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

  const Wrapper = isFullScreen || hideActions ? Box : ThemedCard
  const wrapperSx = isFullScreen
    ? {
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
    : hideActions
      ? { p: 0, position: 'relative', width: '100%' }
      : {
          p: { xs: 1.25, md: 2.5 },
          width: 'fit-content',
          maxWidth: '100%',
          boxSizing: 'border-box',
          borderRadius: 3,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          position: 'relative',
        }
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
      <Wrapper sx={wrapperSx}>
        {isInstructorView && onEditQuestion && !isFullScreen && !hideActions && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Edit question">
              <Box
                component="span"
                onClick={onEditQuestion}
                role="button"
                aria-label="Edit question"
                sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}
              >
                <EditIcon fontSize="small" />
              </Box>
            </Tooltip>
          </Box>
        )}
        {proof.description && !isFullScreen && !hideActions && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <PromptText content={proof.description} sx={{ fontSize: '1.171875rem', flex: 1 }} />
          </Box>
        )}
        {isPhone && !isFullScreen && canOpenFullScreen ? (
          <Box
            component="button"
            type="button"
            onClick={() => onOpenFullScreen(null)}
            sx={{
              display: 'block',
              width: '100%',
              py: 3,
              px: 2,
              border: (t) => `1px solid ${t.palette.divider}`,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
              color: 'primary.main',
              fontSize: '1.171875rem',
              lineHeight: 2,
              fontWeight: 400,
              cursor: 'pointer',
              textAlign: 'center',
              '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
            }}
          >
            {MOBILE_DERIVATION_PLACEHOLDER_MSG}
          </Box>
        ) : (
        <>
        <DerivationHeader
          allowedRules={allowedRules}
          argument={argumentTarget}
          isFullScreen={isFullScreen}
          onRuleInputModeChange={handleRuleInputModeChange}
          ruleInputMode={ruleInputMode}
          usesNestedSubderivations={usesNestedSubderivations}
        />
        <TableContainer
          component={Box}
          sx={{
            width: '100%',
            ...(isFullScreen ? { overflowX: 'hidden', overflow: 'visible', padding: 0, margin: 0 } : { overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }), // fullscreen: no extra padding
          }}
        >
          {/* mobile: small table. fullscreen: last column no right padding (mui default). */}
          <Table
            size={isMobile ? 'small' : 'medium'}
            sx={{
              '& .MuiTableRow-root': { height: 'auto' },
              ...(isFullScreen
                ? {
                    tableLayout: 'fixed',
                    width: '100%',
                    '& td:last-child': { paddingRight: '0 !important' },
                    '& .MuiTableCell-root:last-child': { paddingRight: '0 !important' },
                  }
                : { width: 'auto', minWidth: isMobile ? DERIVATION_FORMULA_MIN_WIDTH : DERIVATION_FORMULA_WIDTH }),
            }}
          >
            <TableBody>
            {!usesNestedSubderivations && premises.length === 0 && proof?.conclusion && (
              <TableRow
                key="conclusion-row"
                sx={{
                  '& td': {
                    py: isMobile ? 0.25 : 0.5,
                    position: 'relative',
                    verticalAlign: 'middle',
                  },
                }}
              >
                <TableCell sx={{ width: isFullScreen || isMobile ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE : DERIVATION_NUMBER_CELL_WIDTH_DESKTOP, minWidth: isFullScreen || isMobile ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE : undefined, borderBottom: 'none', verticalAlign: 'middle', px: 0.5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'transparent' }}>—</Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: 'none', pl: isFullScreen ? 1 : undefined, pr: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
                  <Typography sx={{ color: 'transparent' }}>—</Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: 'none', pl: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
                  <DerivationFormulaText
                    text={conclusionTargetText}
                    id="conclusion-target"
                    onInsert={(insert) => handleSymbolInsert({ insert })}
                  />
                </TableCell>
              </TableRow>
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
              const isPremiseLine = usesNestedSubderivations && idx < premises.length
              const showsFitchDivider = isPremiseLine || startsScope
              return (
              <TableRow
                key={`line-${idx}`}
                sx={{
                  '& td': {
                    py: isMobile ? 0.25 : 0.5,
                    position: 'relative',
                    verticalAlign: 'middle',
                  },
                }}
              >
                <TableCell
                  sx={{
                    width: isFullScreen || isMobile ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE : DERIVATION_NUMBER_CELL_WIDTH_DESKTOP,
                    minWidth: isFullScreen || isMobile ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE : undefined,
                    borderBottom: 'none',
                    px: 0.5,
                    textAlign: 'center',
                    color: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.78 : 0.7),
                    fontWeight: 600,
                    verticalAlign: 'middle',
                    ...(usesNestedSubderivations && {
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: -1,
                        bottom: -1,
                        right: -1,
                        width: FITCH_LINE_WIDTH,
                        borderRadius: 1,
                        bgcolor: getFitchLineColor,
                        pointerEvents: 'none',
                        zIndex: 1,
                      },
                    }),
                    ...(isFullScreen && { pr: 1 }),
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleRowNumberClick(idx + 1)
                    }}
                    sx={{
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'inherit',
                      fontWeight: 600,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    title="Add to line(s)"
                    aria-label={`Add ${idx + 1} to line(s)`}
                  >
                    {idx + 1}
                  </Box>
                </TableCell>
                <DerivationFormulaCell
                  activeLogicSystem={activeLogicSystem}
                  depth={scopeDepth}
                  isFullScreen={isFullScreen}
                  isPhone={isPhone}
                  keyboardConfig={derivationKeyboardConfig}
                  line={line}
                  lineIndex={idx}
                  mobileKeyboardEnabled={mobileLogicKeyboardEnabled}
                  onActivate={() => {
                    setActiveFormulaIndex(idx)
                    activeKeyboardFormulaIndexRef.current = idx
                    lastFormulaIndexRef.current = idx
                    lastEditableIndexRef.current = idx
                  }}
                  onChange={(event) => handleFormulaChange(event, idx)}
                  onCommit={(value) => handleLineCommit(idx, 'formula', normalizeFormulaForCheck(value))}
                  onCursorChange={(event) => {
                    lastFormulaIndexRef.current = idx
                    lastEditableIndexRef.current = idx
                    updateCursorPosition(idx, event)
                  }}
                  onInsert={(insert) => handleSymbolInsert({ insert })}
                  onKeyDown={(event) => handleFormulaKeyDown(event, idx)}
                  onMobileChange={(value) => handleLineChange(idx, 'formula', normalizeFormulaForDisplay(value))}
                  onMobileCursorChange={(position) => {
                    const max = (line.formula ?? '').length
                    setStoredSelection(idx, Math.max(0, Math.min(Number.isFinite(position) ? position : 0, max)))
                  }}
                  onRequestFullScreen={(event) => {
                    if (!canOpenFullScreen) return
                    event.preventDefault()
                    event.stopPropagation()
                    handleInputRequestFullScreen(idx, 'formula')
                  }}
                  registerInput={(element) => { if (element) formulaRefs.current[idx] = element }}
                  showsDivider={showsFitchDivider}
                  startsScope={startsScope}
                />
                <DerivationJustificationCell
                  activeFormulaIndex={activeFormulaIndex}
                  allowedRules={allowedRules}
                  assumptionRules={activeAssumptionRules}
                  autoCheckEnabled={autoCheckEnabled}
                  autoCheckStatus={autoCheckState.perLine[idx]}
                  citationDraft={lineDrafts[idx]}
                  conclusion={isFixedProof ? '' : conclusionTargetText}
                  isFullScreen={isFullScreen}
                  isMobile={isMobile}
                  isPhone={isPhone}
                  line={line}
                  lineIndex={idx}
                  onActivate={() => {
                    if (isDerivationFieldReadOnly(line, 'justification')) return
                    setActiveFormulaIndex(idx)
                    lastEditableIndexRef.current = idx
                  }}
                  onCitationChange={(raw) => handleCitationChange(idx, line, raw)}
                  onCitationCommit={(raw) => handleCitationCommit(idx, line, raw)}
                  onDelete={() => deleteLine(idx)}
                  onInsert={(insert) => handleSymbolInsert({ insert })}
                  onJustificationChange={(event) => handleJustificationChange(event, idx)}
                  onKeyDown={(event) => handleJustKeyDown(event, idx)}
                  onRequestFullScreen={(event) => {
                    if (!canOpenFullScreen) return
                    event.preventDefault()
                    event.stopPropagation()
                    handleInputRequestFullScreen(idx, 'justification')
                  }}
                  onRuleChange={(rule) => handleRuleChange(idx, line, rule)}
                  onTypedCommit={(raw) => handleTypedJustificationCommit(idx, raw)}
                  premisesCount={premises.length}
                  registerInput={(element) => { if (element) justRefs.current[idx] = element }}
                  useRuleDropdown={useRuleDropdown}
                  usesNestedSubderivations={usesNestedSubderivations}
                />
              </TableRow>
              )
            })}
            {!isFixedProof && (
              <DerivationKeyboardRow
                canAddLine={canAddLine}
                isFullScreen={isFullScreen}
                isMobile={isMobile}
                isPhone={isPhone}
                mobileLogicKeyboardEnabled={mobileLogicKeyboardEnabled}
                onAddLine={addLine}
                onInsert={handleSymbolInsert}
                symbolButtons={symbolButtons}
              />
            )}
            </TableBody>
          </Table>
        </TableContainer>

        <DerivationFeedbackPanel
          autoCheckEnabled={autoCheckEnabled}
          autoCheckRows={autoCheckState.rows}
          isFullScreen={isFullScreen}
          lineGateNotice={lineGateNotice}
          onToggleAutoCheck={() => setAutoCheckEnabled((enabled) => !enabled)}
        />

        </>
        )}

      </Wrapper>
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
            scoreLabel={scoreLabel}
          />
        </Box>
      )}
    </Stack>
  )
}
