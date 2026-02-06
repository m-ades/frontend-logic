import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  FormControl,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Select,
  TextField,
  Typography,
  IconButton,
  Button,
  Tooltip,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RemoveIcon from '@mui/icons-material/Remove'
import EditIcon from '@mui/icons-material/Edit'
import { alpha } from '@mui/material/styles'
import { fetchJson, getActiveUserId } from '../../../utils/api.js'
import { getSubmissionScore } from '../../../utils/problemHelpers.js'
import PromptText from '../../ui/PromptText.jsx'
import ThemedCard from '../../ui/ThemedCard.jsx'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import checkDerivation from '../../../lib/logicpenguin/checkers/derivation-hurley.js'
import getHurleyRuleset from '../../../lib/logicpenguin/checkers/rules/hurley-rules.js'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { justParse } from '../../ui/logicpenguin/justification-parse.js'

/** Compare formula strings by canonical form so ∃x(~Hx) and ∃x~Hx count equal */
function formulasEqualNormally(a, b, normalizeForFallback) {
  if (!a && !b) return true
  if (!a || !b) return false
  try {
    const Formula = getFormulaClass()
    return Formula.from(String(a)).normal === Formula.from(String(b)).normal
  } catch {
    return normalizeForFallback ? normalizeForFallback(a) === normalizeForFallback(b) : false
  }
}

const SYMBOL_BUTTONS = [
  { label: '~', insert: '~' },
  { label: '•', insert: '•' },
  { label: '∨', insert: '∨' },
  { label: '⊃', insert: '⊃' },
  { label: '≡', insert: '≡' },
  { label: '(∀x)', insert: '(∀x)' },
  { label: '(∃x)', insert: '(∃x)' },
  { label: '(  )', pair: '()' },
  { label: '[  ]', pair: '[]' },
]
// mobile fullscreen only. second row: (∀x) (∃x) ( ) [ ] under ~ • ∨ ⊃
const SYMBOL_ROW2 = [SYMBOL_BUTTONS[5], SYMBOL_BUTTONS[6], SYMBOL_BUTTONS[7], SYMBOL_BUTTONS[8]]
const FORCE_UPPER_RULES = new Set(['UI','UG','EI','EG','MP','MT','HS','DS','CD','DN','DM','CQ','QN','CP','IP','ACP','AIP'])
const ALL_DERIVATION_RULES = Object.keys(getHurleyRuleset())
  .filter((r) => r !== 'Pr' && r !== 'Ass')
  .map((r) => (FORCE_UPPER_RULES.has(r.toUpperCase()) ? r.toUpperCase() : r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()))
const RULES_ALLOW_NO_LINES = new Set(['ACP', 'AIP'])
const ASSUMPTION_RULES = new Set(['ACP', 'AIP'])
const INDENT_START_RULES = new Set(['ACP', 'AIP'])
const INDENT_END_RULES = new Set(['CP', 'IP'])
const INDENT_PX = 18
const ASSUMPTION_INDENT_PX = 12
const MAX_INDENT_LEVEL = 3
const AUTO_CHECK_STORAGE_KEY = 'logic-app:autocheck-enabled'
const RULE_INPUT_MODE_KEY = 'logic-app:derivation-rule-input-mode'

// Message shown on mobile when derivation is not fullscreen (table not rendered)
const MOBILE_DERIVATION_PLACEHOLDER_MSG = 'Tap to open proof'

const symbolBtnSx = (isFullScreen, isMobile, isPhone) => {
  const mobileFullscreen = isPhone && isFullScreen
  return {
    minWidth: mobileFullscreen ? 42 : (isFullScreen ? 28 : 34),
    px: mobileFullscreen ? 1.25 : (isFullScreen ? 0.75 : 1),
    py: mobileFullscreen ? 0.5 : 0.35,
    fontSize: mobileFullscreen ? '1.0625rem' : (isFullScreen ? '0.8125rem' : '0.95rem'),
    lineHeight: 1.1,
    minHeight: mobileFullscreen ? 44 : 32,
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: 'none',
    border: 'none',
    bgcolor: (theme) =>
      theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.08) : theme.palette.grey[100],
    color: 'text.primary',
    '&:hover': (theme) => ({
      boxShadow: 'none',
      border: 'none',
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
    }),
  }
}

const getUnderlineColors = (theme) => {
  if (theme.palette.mode === 'dark') {
    return {
      base: theme.palette.divider,
      hover: alpha(theme.palette.common.white, 0.24),
      focus: theme.palette.primary.main,
    }
  }
  return {
    base: '#e3e6ee',
    hover: '#edf1f7',
    focus: '#dfe5f0',
  }
}

const getInputUnderlineSx = (theme) => {
  const colors = getUnderlineColors(theme)
  return {
    '& .MuiInput-underline:before': { borderBottomColor: colors.base },
    '& .MuiInput-underline:hover:before': { borderBottomColor: colors.hover },
    '& .MuiInput-underline:after': { borderBottomColor: colors.focus },
  }
}

const getSelectUnderlineSx = (theme) => {
  const colors = getUnderlineColors(theme)
  return {
    '&:before': { borderBottomColor: colors.base },
    '&:hover:not(.Mui-disabled):before': { borderBottomColor: colors.hover },
    '&:after': { borderBottomColor: colors.focus },
    '& .MuiInput-underline:before': { borderBottomColor: colors.base },
    '& .MuiInput-underline:hover:before': { borderBottomColor: colors.hover },
    '& .MuiInput-underline:after': { borderBottomColor: colors.focus },
  }
}

const applyInsertion = (value, selectionStart, selectionEnd, insertText, replaceBefore = 0) => {
  const start = selectionStart ?? value.length
  const end = selectionEnd ?? start
  const before = value.slice(0, Math.max(0, start - replaceBefore))
  const after = value.slice(end)
  const nextValue = before + insertText + after
  const nextCursor = before.length + insertText.length
  return { nextValue, nextCursor }
}

const formatRuleName = (rule) => {
  if (!rule) return ''
  if (FORCE_UPPER_RULES.has(rule.toUpperCase())) {
    return rule.toUpperCase()
  }
  return rule.charAt(0).toUpperCase() + rule.slice(1).toLowerCase()
}

const formatJustificationParts = (nums, ranges, citedrules) => {
  citedrules = citedrules.map((rule) => formatRuleName(rule))

  let pretty = nums.map((n) => n.toString()).join(', ')
  if (ranges.length > 0) {
    if (pretty !== '') pretty += ', '
    pretty += ranges.map(([s, e]) => `${s}–${e}`).join(', ')
  }
  if (citedrules.length > 0) {
    if (pretty !== '') pretty += ' '
    pretty += citedrules.join(', ')
  }
  return pretty
}

const formatJustificationDisplay = (value) => {
  if (!value) return ''
  let { nums, ranges, citedrules } = justParse(String(value))
  return formatJustificationParts(nums, ranges, citedrules)
}

const getJustificationMeta = (value) => {
  const { nums, ranges, citedrules } = justParse(String(value || ''))
  return {
    hasLines: nums.length > 0 || ranges.length > 0,
    hasRule: Array.isArray(citedrules) && citedrules.length > 0,
  }
}

const formatJustificationLines = (value) => {
  if (!value) return ''
  let { nums, ranges } = justParse(String(value))
  return formatJustificationParts(nums, ranges, [])
}

const applyRuleToJustification = (value, rule) => {
  const { nums, ranges } = justParse(String(value || ''))
  const nextRules = rule ? [rule] : []
  return formatJustificationParts(nums, ranges, nextRules)
}

const applyLinesToJustification = (value, linesInput) => {
  const existingRule = getRuleFromJustification(value)
  const { nums, ranges } = justParse(String(linesInput || ''))
  return formatJustificationParts(nums, ranges, existingRule ? [existingRule] : [])
}

const getRuleFromJustification = (value) => {
  const { citedrules } = justParse(String(value || ''))
  if (!Array.isArray(citedrules) || citedrules.length === 0) return ''
  return formatRuleName(citedrules[0])
}

const buildErrorRows = (errors, linesSnapshot = [], { skipCompletion = false } = {}) => {
  if (!errors) return []
  const lines = Object.keys(errors).sort((a, b) => {
    if (a === '??') return -1
    if (b === '??') return 1
    return Number(a) - Number(b)
  })
  const rows = []
  for (const line of lines) {
    const categories = errors[line] || {}
    const entries = []
    const idx = line !== '??' ? Number(line) - 1 : -1
    const lineRule = idx >= 0 ? getRuleFromJustification(linesSnapshot[idx]?.justification || '').toUpperCase() : ''
    for (const category of Object.keys(categories)) {
      if (skipCompletion && category === 'completion') continue
      const severities = categories[category] || {}
      const descs = []
      for (const severity of Object.keys(severities)) {
        const items = severities[severity] || {}
        for (const desc of Object.keys(items)) {
          if (
            lineRule &&
            (lineRule === 'CP' || lineRule === 'IP') &&
            desc === 'cites the wrong number of subderivation line ranges for the rule specified'
          ) {
            descs.push(`${desc} (e.g. 3-9)`)
          } else {
            descs.push(desc)
          }
        }
      }
      if (descs.length === 0) continue
      entries.push({
        label: category === 'dependency'
          ? 'Warning'
          : `${category.charAt(0).toUpperCase()}${category.slice(1)} errors`,
        messages: descs,
        isWarning: category === 'dependency',
      })
    }
    if (entries.length > 0) {
      rows.push({ line, entries })
    }
  }
  return rows
}

const lineFromLP = (line) => ({
  formula: line?.s ?? '',
  justification: line?.j ?? '',
  readOnly: false,
})

const extractLines = (savedState, premises = []) => {
  if (!savedState) {
    return []
  }
  const ans = savedState?.ans ?? savedState
  const first = Array.isArray(ans?.parts) ? ans.parts[0] : null
  if (!first) return []
  const parts = Array.isArray(first.parts) ? first.parts : []
  const lines = parts
    .filter((p) => !p.parts) // skip nested subderivations (not supported in simplified UI)
    .map(lineFromLP)
  if (premises.length && lines.length >= premises.length) {
    return lines.map((l, idx) => ({ ...l, readOnly: idx < premises.length }))
  }
  return lines
}

const buildSubmission = (lines, conclusion, premises, normalizeFormula, normalizeJustification) => {
  const numbered = lines.map((line, idx) => ({
    n: String(idx + 1),
    s: normalizeFormula(line.formula ?? ''),
    j: idx < premises.length ? 'Pr' : normalizeJustification(line.justification ?? ''),
  }))
  return {
    ans: {
      parts: [
        {
          showline: { s: normalizeFormula(conclusion || ''), j: '', isMainConclusion: true, n: '' },
          parts: numbered,
        },
      ],
      prems: premises,
      conc: normalizeFormula(conclusion || ''),
    },
  }
}

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
  onCloseFullScreen,
  totalQuestions,
  isCurrentCorrect,
  currentQuestionScore,
  isInstructorView = false,
  onEditQuestion,
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
    const allow = proof?.ruleset?.allow ?? proof?.options?.ruleset?.allow
    if (Array.isArray(allow) && allow.length > 0) {
      const unique = Array.from(new Set(allow.map((rule) => formatRuleName(String(rule)))))
      return unique.filter((rule) => rule && rule.toLowerCase() !== 'pr')
    }
    return ALL_DERIVATION_RULES
  }, [proof?.ruleset, proof?.options?.ruleset])
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
  const [lineGateNotice, setLineGateNotice] = useState({ index: null, message: '' })
  const [lineDrafts, setLineDrafts] = useState({})
  const pendingFocusRef = useRef(null)
  const indentLevels = useMemo(() => {
    let level = 0
    return lines.map((line) => {
      const rule = getRuleFromJustification(line.justification).toUpperCase()
      if (INDENT_END_RULES.has(rule)) {
        level = Math.max(0, level - 1)
      }
      if (INDENT_START_RULES.has(rule)) {
        level = Math.min(level + 1, MAX_INDENT_LEVEL)
      }
      return level
    })
  }, [lines])

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
    const submission = buildSubmission(
      linesSnapshot,
      proof?.conclusion,
      premises,
      normalizeFormulaForCheck,
      normalizeJustificationForCheck
    )
    const result = await checkDerivation(
      { prems: premises, conc: proof?.conclusion, ruleset: proof?.ruleset },
      submission.ans,
      -1,
      proof?.options
    )
    const normalizedConclusion = normalizeFormulaForCheck(proof?.conclusion || '')
    const errors = result?.errors || {}
    const isLineComplete = (idx) => {
      if (idx < premises.length) return true
      return isLineCompleteForCheck(linesSnapshot[idx] || {})
    }
    const filledLineIndices = linesSnapshot
      .map((line, idx) => ({
        idx,
        hasContent: Boolean((line?.formula || '').trim() || (line?.justification || '').trim()),
      }))
      .filter((entry) => entry.idx >= premises.length && entry.hasContent)
      .map((entry) => entry.idx)
    const lastFilledIndex = filledLineIndices.length ? filledLineIndices[filledLineIndices.length - 1] : -1
    const lastFilled = lastFilledIndex >= 0 ? linesSnapshot[lastFilledIndex] : null
    const allFilledComplete = filledLineIndices.every((idx) => isLineComplete(idx))
    const readyForRuleGate = Boolean(
      normalizedConclusion &&
      lastFilled &&
      isLineCompleteForCheck(lastFilled) &&
      formulasEqualNormally(lastFilled.formula || '', proof?.conclusion || '', normalizeFormulaForCheck) &&
      allFilledComplete
    )
    const filteredErrors = {}
    Object.keys(errors).forEach((line) => {
      const categories = errors[line] || {}
      let lineRule = ''
      let isAssumptionLine = false
      if (line !== '??') {
        const idx = Number(line) - 1
        if (Number.isFinite(idx)) {
          lineRule = getRuleFromJustification(linesSnapshot[idx]?.justification || '').toUpperCase()
          isAssumptionLine = ASSUMPTION_RULES.has(lineRule)
          if (!isLineComplete(idx) && !isAssumptionLine) {
            if (lineRule !== 'CP' && lineRule !== 'IP') {
              return
            }
          }
        }
      }
      const nextCats = {}
      Object.keys(categories).forEach((category) => {
        if (line === '??' && category === 'rule' && !readyForRuleGate) return
        if (category === 'completion' && !readyForRuleGate) return
        nextCats[category] = categories[category]
      })
      if (Object.keys(nextCats).length > 0) {
        filteredErrors[line] = nextCats
      }
    })
    const perLine = {}
    linesSnapshot.forEach((line, idx) => {
      if (idx < premises.length) {
        perLine[idx] = null
        return
      }
      const lineNum = String(idx + 1)
      const formulaFilled = Boolean((line?.formula || '').trim())
      const lineRule = getRuleFromJustification(line?.justification || '').toUpperCase()
      const lineErrors = filteredErrors[lineNum] || {}
      if (!formulaFilled) {
        if (ASSUMPTION_RULES.has(lineRule) && Object.keys(lineErrors).length > 0) {
          perLine[idx] = 'error'
        } else {
          perLine[idx] = null
        }
        return
      }
      const { hasLines, hasRule } = getJustificationMeta(line.justification)
      if (!hasRule) {
        perLine[idx] = null
        return
      }
      const blockingCategories = Object.keys(lineErrors).filter((category) => category !== 'dependency')
      const hasError = blockingCategories.length > 0
      perLine[idx] = hasError ? 'error' : 'ok'
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
      !formulasEqualNormally(last.formula || '', proof?.conclusion || '', normalizeFormulaForCheck)
    )
    return { perLine, rows, shouldAutoAdd }
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

  const applyLineChange = (currentLines, index, field, value) =>
    currentLines.map((line, idx) =>
      idx === index ? { ...line, [field]: value } : line
    )

  const handleLineChange = (index, field, value) => {
    setLines((prev) => applyLineChange(prev, index, field, value))
    if (lineGateNotice.index === index) {
      setLineGateNotice({ index: null, message: '' })
    }
  }

  const commitLines = useCallback((updater, clearNoticeIndex = null) => {
    setLines((prev) => {
      const nextLines = updater(prev)
      emitState(nextLines)
      return nextLines
    })
    if (clearNoticeIndex !== null && lineGateNotice.index === clearNoticeIndex) {
      setLineGateNotice({ index: null, message: '' })
    }
  }, [emitState, lineGateNotice.index])

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
      const targetIdx = lastEditableIndexRef.current ?? premises.length
      if (targetIdx < premises.length) return
      commitLines((prev) => {
        const line = prev[targetIdx]
        if (!line) return prev
        const { nums, ranges, citedrules } = justParse(String(line.justification || ''))
        const newNums = [...nums, clickedLineNum]
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
    [premises.length, commitLines]
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
      setLineGateNotice({ index: lines.length - 1, message: 'Re-check current line to move onto the next line.' })
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
    if (readOnly) return
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
      insertSymbol('•')
      return
    }
    if (!hasModifier && (key === 'v' || key === '∨')) {
      insertSymbol('∨')
      return
    }
    if (!hasModifier && (key === '>' || key === '→' || key === '⇒' || key === '⊃')) {
      insertSymbol('⊃')
      return
    }
    if (!hasModifier && key === '=' && start > 0 && value[start - 1] === '=') {
      insertSymbol('≡', 1)
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

  const handleJustKeyDown = async (event, index, readOnly) => {
    if (readOnly) return
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
      const formatted = applyLinesToJustification(lines[index]?.justification, event.target.value)
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
            setLineGateNotice({ index, message: 'Re-check current line to move onto the next line.' })
            return
          }
        } catch (err) {
          setLineGateNotice({ index, message: 'Re-check current line to move onto the next line.' })
          return
        }
      }
      const nextIndex = index + 1
      if (nextIndex >= lines.length) {
        addLine()
        setTimeout(() => focusFormula(nextIndex), 0)
      } else {
        focusFormula(nextIndex)
      }
    }
  }

  const handleStartOver = () => {
    if (isLocked || isAssignmentLocked) return
    const premLines = premises.map((p) => ({ formula: p, justification: '', readOnly: true }))
    const blanks = Array.from({ length: 1 }, () => ({ formula: '', justification: '', readOnly: false }))
    const nextLines = [...premLines, ...blanks]
    setLines(nextLines)
    setStatusBanner({ status: 'unanswered', message: '' })
    emitState(nextLines)
  }

  const handleSubmit = async () => {
    if (isAssignmentLocked) return
    setIsChecking(true)
    try {
      const submission_data = buildSubmission(
        lines,
        proof?.conclusion,
        premises,
        normalizeFormulaForCheck,
        normalizeJustificationForCheck
      )
      const resp = await fetchJson('/api/validate/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_question_id: proof?.questionId,
          user_id: getActiveUserId(),
          submission_data,
        }),
      })
      const validation = resp?.validation || {}
      const successstatus = validation.successstatus || 'incorrect'
      if (typeof resp?.attempt_limit === 'number') {
        setAttemptLimit(resp.attempt_limit)
      }
      setAttemptCount((prev) => resp?.submission?.attempt ?? prev + 1)
      if (typeof window !== 'undefined') {
        const score = getSubmissionScore(resp)
        window.dispatchEvent(new CustomEvent('assignment-submission', {
          detail: {
            assignmentQuestionId: proof?.questionId,
            attempt: resp?.submission?.attempt,
            attemptLimit: resp?.attempt_limit,
            isCorrect: successstatus === 'correct',
            score,
          },
        }))
      }
      setStatusBanner({
        status: successstatus,
        message: validation.message || validation.transmessage || (successstatus === 'correct' ? 'Correct!' : 'Incorrect.'),
      })
      onAttempt?.({
        attempt: resp?.submission?.attempt,
        attemptLimit: resp?.attempt_limit,
      })
      if (successstatus === 'correct') {
        onProofComplete?.(proof.id)
      }
    } catch (err) {
      setStatusBanner({ status: 'malfunction', message: 'Error submitting answer' })
    } finally {
      setIsChecking(false)
    }
  }

  const isLocked = Number.isFinite(attemptLimit) && attemptCount >= attemptLimit
  const submitDisabled = isLocked || isAssignmentLocked

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
        const Wrapper = isFullScreen ? Box : ThemedCard
        // fullscreen: no right padding. fill width. scrollable area so button row can stay sticky
        const wrapperSx = isFullScreen
          ? { py: 2, pl: 0, pr: 0, position: 'relative', flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden' }
          : {
              p: { xs: 1.25, md: 2.5 },
              borderRadius: 3,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              position: 'relative',
            }
        return (
          <Wrapper sx={wrapperSx}>
        {isInstructorView && onEditQuestion && !isFullScreen && (
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
        {proof.description && !isFullScreen && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <PromptText content={proof.description} sx={{ fontSize: 15, flex: 1 }} />
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
              fontSize: '15px',
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
        {allowedRules.length > 0 && (
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', ...(isFullScreen && { pl: 2 }) }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Rule input:
            </Typography>
            <ToggleButtonGroup
              value={ruleInputMode}
              exclusive
              onChange={handleRuleInputModeChange}
              size="small"
              sx={{
                border: 'none',
                '& .MuiToggleButtonGroup-grouped': { border: 'none' },
                '& .MuiToggleButton-root': {
                  py: 0.25,
                  px: 1.25,
                  fontSize: '0.8125rem',
                  border: 'none',
                  '&.Mui-selected': { fontWeight: 600 },
                },
              }}
            >
              <ToggleButton value="type" aria-label="Type rule">
                TYPE
              </ToggleButton>
              <Typography component="span" variant="body2" sx={{ color: 'text.secondary', alignSelf: 'center', px: 0.5 }}>
                or
              </Typography>
              <ToggleButton value="dropdown" aria-label="Select rule from dropdown">
                SELECT FROM LIST
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
        <TableContainer
          component={Box}
          sx={{
            width: '100%',
            ...(isFullScreen ? { overflowX: 'hidden', overflow: 'visible', padding: 0, margin: 0 } : { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }), // fullscreen: no extra padding
          }}
        >
          {/* mobile: small table. fullscreen: last column no right padding (mui default). */}
          <Table
            size={isMobile ? 'small' : 'medium'}
            sx={
              isFullScreen
                ? {
                    tableLayout: 'fixed',
                    width: '100%',
                    '& td:last-child': { paddingRight: '0 !important' },
                    '& .MuiTableCell-root:last-child': { paddingRight: '0 !important' },
                  }
                : { width: 'auto', minWidth: isMobile ? 200 : 280 }
            }
          >
            <TableBody>
            {premises.length === 0 && proof?.conclusion && (
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
                <TableCell sx={{ width: isFullScreen || isMobile ? 36 : 48, minWidth: isFullScreen || isMobile ? 36 : undefined, borderBottom: 'none', verticalAlign: 'middle', ...(isFullScreen && { pr: 1 }) }}>
                  <Typography sx={{ color: 'transparent' }}>—</Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: 'none', pl: isFullScreen ? 1 : undefined, pr: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
                  <Typography sx={{ color: 'transparent' }}>—</Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: 'none', pl: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
                  <Box
                    component="span"
                    sx={{ fontSize: 16, color: 'text.primary', '& .clickable-char': { cursor: 'pointer', borderRadius: 1, '&:hover': { backgroundColor: (t) => alpha(t.palette.primary.main, t.palette.action.hoverOpacity) } } }}
                  >
                    {(`// ${proof.conclusion || ''}`).split('').map((char, i) => {
                      const isLetter = /^[a-zA-Z]$/.test(char)
                      return isLetter ? (
                        <Box component="span" key={`conc-${i}`} className="clickable-char" onPointerDown={(e) => e.preventDefault()} onClick={() => handleSymbolInsert({ insert: char })} aria-label={`Insert ${char}`}>
                          {char}
                        </Box>
                      ) : (
                        <Box component="span" key={`conc-${i}`}>{char}</Box>
                      )
                    })}
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {lines.map((line, idx) => {
              const indentPx = (indentLevels[idx] || 0) * INDENT_PX
                + (indentLevels[idx] ? ASSUMPTION_INDENT_PX : 0)
              return (
              <TableRow
                key={`line-${idx}`}
                sx={{
                  '& td': {
                    py: isMobile ? 0.25 : 0.5,
                    position: 'relative',
                    left: indentPx ? `${indentPx}px` : 0,
                    verticalAlign: 'middle',
                  },
                }}
              >
                <TableCell sx={{ width: isFullScreen || isMobile ? 36 : 48, minWidth: isFullScreen || isMobile ? 36 : undefined, borderBottom: 'none', color: '#4f5b7a', fontWeight: 600, verticalAlign: 'middle', ...(isFullScreen && { pr: 1 }) }}>
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
                <TableCell sx={{ borderBottom: 'none', pl: isFullScreen ? 1 : undefined, pr: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
                  {line.readOnly ? (
                    <Box
                      component="span"
                      sx={(theme) => ({
                        display: 'inline',
                        fontSize: 16,
                        py: isMobile ? 0.5 : 1,
                        ...getInputUnderlineSx(theme),
                        '& .clickable-char': {
                          cursor: 'pointer',
                          borderRadius: 1,
                          '&:hover': { backgroundColor: (t) => alpha(t.palette.primary.main, t.palette.action.hoverOpacity) },
                        },
                      })}
                    >
                      {(line.formula || '').split('').map((char, i) => {
                        const isLetter = /^[a-zA-Z]$/.test(char)
                        return isLetter ? (
                          <Box
                            component="span"
                            key={`${idx}-${i}`}
                            className="clickable-char"
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => handleSymbolInsert({ insert: char })}
                            aria-label={`Insert ${char}`}
                          >
                            {char}
                          </Box>
                        ) : (
                          <Box component="span" key={`${idx}-${i}`}>{char}</Box>
                        )
                      })}
                    </Box>
                  ) : (
                  <TextField
                    variant="standard"
                    placeholder=""
                    value={line.formula}
                    onChange={(e) => handleLineChange(idx, 'formula', e.target.value)}
                    onKeyDown={(e) => handleFormulaKeyDown(e, idx, line.readOnly)}
                    onPointerDown={(e) => {
                      if (line.readOnly) return
                      if (canOpenFullScreen) {
                        e.preventDefault()
                        e.stopPropagation()
                        handleInputRequestFullScreen(idx, 'formula')
                      }
                    }}
                    onClick={(e) => {
                      if (line.readOnly) return
                      lastEditableIndexRef.current = idx
                      updateCursorPosition(idx, e)
                    }}
                    onMouseUp={(e) => {
                      if (line.readOnly) return
                      lastEditableIndexRef.current = idx
                      updateCursorPosition(idx, e)
                    }}
                    onKeyUp={(e) => {
                      if (line.readOnly) return
                      lastEditableIndexRef.current = idx
                      updateCursorPosition(idx, e)
                    }}
                    onSelect={(e) => {
                      if (line.readOnly) return
                      lastEditableIndexRef.current = idx
                      updateCursorPosition(idx, e)
                    }}
                    onBlur={(e) => {
                      updateCursorPosition(idx, e)
                      handleLineCommit(idx, 'formula', normalizeFormulaForCheck(e.target.value))
                    }}
                    InputProps={{ readOnly: line.readOnly }}
                    inputProps={{ autoComplete: 'off' }}
                    inputRef={(el) => { if (el) formulaRefs.current[idx] = el }}
                    onFocus={(e) => {
                      if (line.readOnly) return
                      setActiveFormulaIndex(idx)
                      lastEditableIndexRef.current = idx
                      updateCursorPosition(idx, e)
                    }}
                    sx={(theme) => ({
                      width: isFullScreen ? '100%' : { xs: '100%', md: 280 },
                      minWidth: isFullScreen ? 0 : undefined,
                      ...getInputUnderlineSx(theme),
                      '& .MuiInputBase-input': {
                        fontSize: 16,
                        py: isMobile ? 0.5 : 1,
                      },
                    })}
                  />
                  )}
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: 'none',
                    pl: 0.5,
                    verticalAlign: 'middle',
                    ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }),
                    '& .line-delete': {
                      opacity: isPhone && isFullScreen
                        ? (activeFormulaIndex === idx ? 1 : 0)
                        : 0,
                      transition: 'opacity 120ms ease',
                    },
                    ...(!(isPhone && isFullScreen) && { '&:hover .line-delete': { opacity: 1 } }),
                  }}
                >
                  {idx < premises.length ? (
                    idx === premises.length - 1 ? (
                      <Box
                        component="span"
                        sx={{ fontSize: 16, color: 'text.primary', '& .clickable-char': { cursor: 'pointer', borderRadius: 1, '&:hover': { backgroundColor: (t) => alpha(t.palette.primary.main, t.palette.action.hoverOpacity) } } }}
                      >
                        {(proof?.conclusion ? `// ${proof.conclusion}` : '').split('').map((char, i) => {
                          const isLetter = /^[a-zA-Z]$/.test(char)
                          return isLetter ? (
                            <Box component="span" key={`conc-row-${idx}-${i}`} className="clickable-char" onPointerDown={(e) => e.preventDefault()} onClick={() => handleSymbolInsert({ insert: char })} aria-label={`Insert ${char}`}>
                              {char}
                            </Box>
                          ) : (
                            <Box component="span" key={`conc-row-${idx}-${i}`}>{char}</Box>
                          )
                        })}
                      </Box>
                    ) : (
                      <Typography sx={{ color: 'transparent' }}>—</Typography>
                    )
                  ) : (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'nowrap', gap: 0, minWidth: 0 }}>
                      {useRuleDropdown ? (
                        <>
                          {!ASSUMPTION_RULES.has(getRuleFromJustification(line.justification).toUpperCase()) && (
                            <TextField
                              variant="standard"
                              placeholder="Line(s)"
                              value={lineDrafts[idx] ?? formatJustificationLines(line.justification)}
                              onFocus={() => {
                                if (!line.readOnly && isPhone && isFullScreen) {
                                  setActiveFormulaIndex(idx)
                                  lastEditableIndexRef.current = idx
                                }
                              }}
                              onPointerDown={(e) => {
                                if (line.readOnly) return
                                if (canOpenFullScreen) {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleInputRequestFullScreen(idx, 'justification')
                                }
                              }}
                              onChange={(e) => {
                                const raw = e.target.value
                                setLineDrafts((prev) => ({ ...prev, [idx]: raw }))
                                handleLineChange(
                                  idx,
                                  'justification',
                                  applyLinesToJustification(line.justification, raw)
                                )
                              }}
                              onKeyDown={(e) => handleJustKeyDown(e, idx, line.readOnly)}
                              onBlur={(e) => {
                                const raw = e.target.value
                                handleLineCommit(
                                  idx,
                                  'justification',
                                  applyLinesToJustification(line.justification, raw)
                                )
                                setLineDrafts((prev) => {
                                  if (!(idx in prev)) return prev
                                  const next = { ...prev }
                                  delete next[idx]
                                  return next
                                })
                              }}
                              InputProps={{ readOnly: line.readOnly }}
                              inputProps={{ autoComplete: 'off' }}
                              inputRef={(el) => { if (el) justRefs.current[idx] = el }}
                              sx={(theme) => ({
                                width: '7ch',
                                maxWidth: '7ch',
                                minWidth: '7ch',
                                ...getInputUnderlineSx(theme),
                                '& .MuiInputBase-input': {
                                  fontSize: 16,
                                  py: isMobile ? 0.5 : 1,
                                },
                              })}
                            />
                          )}
                          {allowedRules.length > 0 && (
                            <FormControl variant="standard" sx={{ minWidth: isFullScreen || isMobile ? 56 : 70 }}>
                              <Select
                                value={getRuleFromJustification(line.justification)}
                                displayEmpty
                                onFocus={() => {
                                  if (!line.readOnly && isPhone && isFullScreen) {
                                    setActiveFormulaIndex(idx)
                                    lastEditableIndexRef.current = idx
                                  }
                                }}
                                onChange={(e) => {
                                  const selectedRule = String(e.target.value || '')
                                  const upperRule = selectedRule.toUpperCase()
                                  const nextValue = ASSUMPTION_RULES.has(upperRule)
                                    ? applyRuleToJustification('', selectedRule)
                                    : applyRuleToJustification(line.justification, selectedRule)
                                  commitLines((prev) => {
                                    let nextLines = applyLineChange(prev, idx, 'justification', nextValue)
                                    if (ASSUMPTION_RULES.has(upperRule)) {
                                      const nextIdx = idx + 1
                                      const nextLine = nextLines[nextIdx]
                                      const isBlankLine = nextLine &&
                                        !nextLine.readOnly &&
                                        !(nextLine.formula || '').trim() &&
                                        !(nextLine.justification || '').trim()
                                      if (nextLine && isBlankLine) {
                                        return nextLines
                                      }
                                      if (!nextLine || !nextLine.readOnly) {
                                        const newLine = { formula: '', justification: '', readOnly: false }
                                        nextLines = [
                                          ...nextLines.slice(0, nextIdx),
                                          newLine,
                                          ...nextLines.slice(nextIdx),
                                        ]
                                      }
                                    }
                                    return nextLines
                                  }, idx)
                                  if (ASSUMPTION_RULES.has(upperRule)) {
                                    setLineDrafts((prev) => {
                                      if (!(idx in prev)) return prev
                                      const next = { ...prev }
                                      delete next[idx]
                                      return next
                                    })
                                  }
                                }}
                                renderValue={(value) => value || 'Rule'}
                                sx={(theme) => ({
                                  '& .MuiSelect-select': { fontSize: 16, py: isMobile ? 0.5 : 1 },
                                  '& .MuiInputBase-input': { fontSize: 16, py: isMobile ? 0.5 : 1 },
                                  '& .MuiSelect-select.MuiInputBase-input': { display: 'flex', alignItems: 'center' },
                                  ...getSelectUnderlineSx(theme),
                                })}
                                MenuProps={{
                                  PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: 16 } } }
                                }}
                              >
                                <MenuItem value="">
                                  <em>Rule</em>
                                </MenuItem>
                                {allowedRules.map((rule) => (
                                  <MenuItem key={rule} value={rule}>
                                    {rule}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        </>
                      ) : (
                        <TextField
                          variant="standard"
                          placeholder={idx === premises.length ? 'Line(s) and rule' : ''}
                          value={line.justification}
                          onPointerDown={(e) => {
                            if (line.readOnly) return
                            if (canOpenFullScreen) {
                              e.preventDefault()
                              e.stopPropagation()
                              handleInputRequestFullScreen(idx, 'justification')
                            }
                          }}
                          onChange={(e) => handleLineChange(idx, 'justification', e.target.value)}
                          onKeyDown={(e) => handleJustKeyDown(e, idx, line.readOnly)}
                          onBlur={(e) => {
                            const raw = (e.target.value || '').trim()
                            const formatted = raw ? formatJustificationDisplay(raw) : ''
                            if (formatted !== raw) {
                              handleLineChange(idx, 'justification', formatted)
                            }
                            handleLineCommit(idx, 'justification', formatted || raw)
                          }}
                          InputProps={{ readOnly: line.readOnly }}
                          inputProps={{ autoComplete: 'off' }}
                          inputRef={(el) => { if (el) justRefs.current[idx] = el }}
                          sx={(theme) => ({
                            width: { xs: 'calc(7ch + 56px)', sm: 'calc(7ch + 70px)' },
                            maxWidth: { xs: 'calc(7ch + 56px)', sm: 'calc(7ch + 70px)' },
                            minWidth: { xs: 'calc(7ch + 56px)', sm: 'calc(7ch + 70px)' },
                            ...getInputUnderlineSx(theme),
                            '& .MuiInputBase-input': {
                              fontSize: 16,
                              py: isMobile ? 0.5 : 1,
                            },
                          })}
                        />
                      )}
                      {autoCheckEnabled && autoCheckState.perLine[idx] === 'ok' && (
                        <CheckCircleIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      )}
                      {autoCheckEnabled && autoCheckState.perLine[idx] === 'error' && (
                        <CancelIcon fontSize="small" color="error" />
                      )}
                      {idx >= premises.length && !line.readOnly && (
                        <Tooltip title="Delete line">
                          <IconButton
                            onClick={() => deleteLine(idx)}
                            size="small"
                            aria-label={`Delete line ${idx + 1}`}
                            className="line-delete"
                          >
                            <RemoveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
              )
            })}
            <TableRow sx={{ '& td': { verticalAlign: 'middle', py: isMobile ? 0.25 : 0.5 } }}>
              <TableCell sx={{ width: isFullScreen || isMobile ? 36 : 48, minWidth: isFullScreen || isMobile ? 36 : undefined, borderBottom: 'none', verticalAlign: 'middle', ...(isFullScreen && { pr: 1 }) }}>
                <Tooltip title="New line">
                  <span style={{ display: 'inline-flex' }}>
                    <IconButton onClick={addLine} size="small" aria-label="Add line" disabled={!canAddLine}>
                      <SubdirectoryArrowRightIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ borderBottom: 'none', pl: 0.5, verticalAlign: 'middle' }} colSpan={2}>
                <Stack direction="row" alignItems="center" sx={{ overflowX: isFullScreen ? 'hidden' : 'auto', overflowY: 'hidden', py: 0.5, WebkitOverflowScrolling: 'touch' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isFullScreen ? 0.5 : 0.75,
                      flexWrap: isFullScreen ? 'wrap' : 'nowrap',
                      minWidth: isFullScreen ? 0 : 'max-content',
                      pr: isFullScreen ? 0 : 1,
                      ...(isPhone && isFullScreen && { flexDirection: 'column', alignItems: 'flex-start' }), // two rows only in mobile fullscreen
                    }}
                  >
                    {isPhone && isFullScreen ? (
                      <>
                        {/* row 1: autochecker + first five */}
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isFullScreen ? 0.5 : 0.75, flexShrink: 0 }}>
                          <Tooltip title={autoCheckEnabled ? 'Turn off autochecker' : 'Turn on autochecker'}>
                            <IconButton
                              onClick={() => setAutoCheckEnabled((prev) => !prev)}
                              size="small"
                              aria-label="Toggle autochecker"
                              sx={{ color: autoCheckEnabled ? 'primary.main' : 'text.disabled', position: 'relative' }}
                            >
                              <AutoAwesomeIcon />
                            </IconButton>
                          </Tooltip>
                          {SYMBOL_BUTTONS.slice(0, 5).map((btn) => (
                            <Button
                              key={btn.label}
                              type="button"
                              size="small"
                              variant="outlined"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSymbolInsert({ insert: btn.insert, pair: btn.pair })}
                              sx={symbolBtnSx(isFullScreen, isMobile, isPhone)}
                            >
                              {btn.label}
                            </Button>
                          ))}
                        </Box>
                        {/* row 2: spacer (under autochecker) then (∀x) (∃x) ( ) [ ] then spacer under ≡ */}
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isFullScreen ? 0.5 : 0.75, flexShrink: 0 }}>
                          <Box sx={{ width: 40, minWidth: 40, flexShrink: 0 }} aria-hidden />
                          {SYMBOL_ROW2.map((btn) => (
                            <Button
                              key={btn.label}
                              type="button"
                              size="small"
                              variant="outlined"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSymbolInsert({ insert: btn.insert, pair: btn.pair })}
                              sx={symbolBtnSx(isFullScreen, isMobile, isPhone)}
                            >
                              {btn.label}
                            </Button>
                          ))}
                          <Box sx={{ minWidth: (isPhone && isFullScreen) ? 42 : (isFullScreen ? 28 : 34), px: (isPhone && isFullScreen) ? 1.25 : (isFullScreen ? 0.75 : 1), flexShrink: 0 }} aria-hidden />
                        </Box>
                      </>
                    ) : (
                      <>
                        <Tooltip title={autoCheckEnabled ? 'Turn off autochecker' : 'Turn on autochecker'}>
                          <IconButton
                            onClick={() => setAutoCheckEnabled((prev) => !prev)}
                            size="small"
                            aria-label="Toggle autochecker"
                            sx={{
                              color: autoCheckEnabled ? 'primary.main' : 'text.disabled',
                              position: 'relative',
                            }}
                          >
                            <AutoAwesomeIcon />
                          </IconButton>
                        </Tooltip>
                        {SYMBOL_BUTTONS.map(({ label, insert, pair }) => (
                          <Button
                            key={label}
                            type="button"
                            size="small"
                            variant="outlined"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSymbolInsert({ insert, pair })}
                            sx={symbolBtnSx(isFullScreen, isMobile, isPhone)}
                          >
                            {label}
                          </Button>
                        ))}
                      </>
                    )}
                  </Box>
                </Stack>
              </TableCell>
            </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {lineGateNotice.message && (
          <Typography variant="body2" sx={{ mt: 1, color: 'error.main', ...(isFullScreen && { pl: 2 }) }}>
            {lineGateNotice.message}
          </Typography>
        )}

        {autoCheckEnabled && (
          <Box sx={{ mt: 2, color: 'text.secondary', ...(isFullScreen && { pl: 2 }) }}>
            {autoCheckState.rows.length > 0 ? (
              autoCheckState.rows.map((row, idx) => (
                <Box key={`autocheck-row-${idx}`} sx={{ mb: 1 }}>
                  {row.line && row.line !== '??' && (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Line {row.line}
                    </Typography>
                  )}
                  {row.entries.map((entry, entryIdx) => (
                    <Typography key={`autocheck-entry-${idx}-${entryIdx}`} variant="body2">
                      <strong>{entry.label}:</strong> {entry.messages.join('; ')}
                    </Typography>
                  ))}
                </Box>
              ))
            ) : (
              <Typography variant="body2">Autochecker on: no issues detected yet.</Typography>
            )}
          </Box>
        )}

        </>
        )}

          </Wrapper>
        )
      })()}
      {/* fullscreen: sticky button row at bottom; non-fullscreen: normal flow */}
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
            if (isCurrentCorrect) return { text: `${maxLabel}/${maxLabel}`, color: 'success.main' }
            if (isLockedOut) return { text: `0/${maxLabel}`, color: 'error.main' }
            return null
          })() : null}
        />
      </Box>
    </Stack>
  )
}
