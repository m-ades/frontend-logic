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
  Chip,
  Tooltip,
  MenuItem,
} from '@mui/material'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RemoveIcon from '@mui/icons-material/Remove'
import { alpha } from '@mui/material/styles'
import { fetchJson, getActiveUserId } from '../../../utils/api.js'
import PromptText from '../../ui/PromptText.jsx'
import ThemedCard from '../../ui/ThemedCard.jsx'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import checkDerivation from '../../../lib/logicpenguin/checkers/derivation-hurley.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { justParse } from '../../ui/logicpenguin/justification-parse.js'

const SYMBOLS = ['~', '•', '∨', '⊃', '≡', '(∀x)', '(∃x)']
const FORCE_UPPER_RULES = new Set(['UI','UG','EI','EG','MP','MT','HS','DS','CD','DN','DM','CQ','QN','CP','IP','ACP','AIP'])
const RULES_ALLOW_NO_LINES = new Set(['ACP', 'AIP'])
const ASSUMPTION_RULES = new Set(['ACP', 'AIP'])
const INDENT_START_RULES = new Set(['ACP', 'AIP'])
const INDENT_END_RULES = new Set(['CP', 'IP'])
const INDENT_PX = 18
const MAX_INDENT_LEVEL = 3
const AUTO_CHECK_STORAGE_KEY = 'logic-app:autocheck-enabled'
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
  const allowedRules = useMemo(() => {
    const allow = proof?.ruleset?.allow ?? proof?.options?.ruleset?.allow ?? []
    if (!Array.isArray(allow)) return []
    const unique = Array.from(new Set(allow.map((rule) => formatRuleName(String(rule)))))
    return unique.filter((rule) => rule && rule.toLowerCase() !== 'pr')
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

  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  const emitState = useCallback((linesSnapshot) => {
    const submission = buildSubmission(
      linesSnapshot,
      proof?.conclusion,
      premises,
      normalizeFormulaForCheck,
      normalizeJustificationForCheck
    )
    onStateChangeRef.current?.(submission)
  }, [premises, proof?.conclusion, normalizeFormulaForCheck, normalizeJustificationForCheck])

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
      normalizeFormulaForCheck(lastFilled.formula || '') === normalizedConclusion &&
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
        if (category === 'completion' && !readyForRuleGate && !isAssumptionLine) return
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
      normalizeFormulaForCheck(last.formula || '') !== normalizedConclusion
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
            const normalizedConclusion = normalizeFormulaForCheck(proof?.conclusion || '')
            if (!normalizedConclusion) return prev
            const normalizedLast = normalizeFormulaForCheck(last.formula || '')
            if (normalizedLast === normalizedConclusion) return prev
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

  const updateCursorPosition = (index, event) => {
    const target = event?.target
    if (target && typeof target.selectionStart === 'number') {
      cursorPositionsRef.current[index] = target.selectionStart
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
    const key = event.key
    const value = el.value ?? ''
    const start =
      typeof el.selectionStart === 'number'
        ? el.selectionStart
        : (typeof cursorPositionsRef.current[index] === 'number'
            ? cursorPositionsRef.current[index]
            : value.length)
    const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : start
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
        cursorPositionsRef.current[index] = nextCursor
        setTimeout(() => el.setSelectionRange(nextCursor, nextCursor), 0)
        return
      }
      const { nextValue, nextCursor } = applyInsertion(value, start, end, symbol, replaceBefore)
      handleLineChange(index, 'formula', nextValue)
      cursorPositionsRef.current[index] = nextCursor
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
        insertSymbol('∀', 3)
      }
      return
    }
    if (!hasModifier && (key === 'e' || key === 'E')) {
      const textWithKey = value.slice(0, start) + key.toLowerCase()
      if (/some$/i.test(textWithKey)) {
        insertSymbol('∃', 4)
      }
    }
  }

  const handleJustKeyDown = async (event, index, readOnly) => {
    if (readOnly) return
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
    if (isLocked) return
    const premLines = premises.map((p) => ({ formula: p, justification: '', readOnly: true }))
    const blanks = Array.from({ length: 1 }, () => ({ formula: '', justification: '', readOnly: false }))
    const nextLines = [...premLines, ...blanks]
    setLines(nextLines)
    setStatusBanner({ status: 'unanswered', message: '' })
    emitState(nextLines)
  }

  const handleSubmit = async () => {
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
        window.dispatchEvent(new CustomEvent('assignment-submission', {
          detail: {
            assignmentQuestionId: proof?.questionId,
            attempt: resp?.submission?.attempt,
            attemptLimit: resp?.attempt_limit,
            isCorrect: successstatus === 'correct',
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

  return (
    <Stack spacing={2}>
      <ThemedCard
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        {proof.description && (
          <Box sx={{ mb: 2 }}>
            <PromptText content={proof.description} sx={{ fontSize: 15 }} />
          </Box>
        )}
        <TableContainer component={Box} sx={{ width: '100%' }}>
          <Table size="medium" sx={{ width: 'auto' }}>
            <TableBody>
            {lines.map((line, idx) => {
              const indentPx = (indentLevels[idx] || 0) * INDENT_PX
              return (
              <TableRow
                key={`line-${idx}`}
                sx={{
                  '& td': {
                    py: 0.5,
                    position: 'relative',
                    left: indentPx ? `${indentPx}px` : 0,
                  },
                }}
              >
                <TableCell sx={{ width: 48, borderBottom: 'none', color: '#4f5b7a', fontWeight: 600 }}>
                  {idx + 1}
                </TableCell>
                <TableCell sx={{ borderBottom: 'none', width: 'auto', pr: 0.5, whiteSpace: 'nowrap' }}>
                  <TextField
                    variant="standard"
                    placeholder=""
                    value={line.formula}
                    onChange={(e) => handleLineChange(idx, 'formula', e.target.value)}
                    onKeyDown={(e) => handleFormulaKeyDown(e, idx, line.readOnly)}
                    onClick={(e) => {
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
                    onBlur={(e) => handleLineCommit(idx, 'formula', normalizeFormulaForCheck(e.target.value))}
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
                      width: { xs: '100%', md: 280 },
                      ...getInputUnderlineSx(theme),
                      '& .MuiInputBase-input': { fontSize: 16, py: 1 },
                    })}
                  />
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: 'none',
                    width: 'auto',
                    pl: 0.5,
                    whiteSpace: 'nowrap',
                    '& .line-delete': { opacity: 0, transition: 'opacity 120ms ease' },
                    '&:hover .line-delete': { opacity: 1 },
                  }}
                >
                  {idx < premises.length ? (
                    idx === premises.length - 1 ? (
                      <Typography component="span" sx={{ fontSize: 16, color: 'text.primary' }}>
                        {proof?.conclusion ? `// ${proof.conclusion}` : ''}
                      </Typography>
                    ) : (
                      <Typography sx={{ color: 'transparent' }}>—</Typography>
                    )
                  ) : (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                      {!ASSUMPTION_RULES.has(getRuleFromJustification(line.justification).toUpperCase()) && (
                        <TextField
                          variant="standard"
                          placeholder="Line(s)"
                          value={lineDrafts[idx] ?? formatJustificationLines(line.justification)}
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
                            width: { xs: '100%', md: 58 },
                            ...getInputUnderlineSx(theme),
                            '& .MuiInputBase-input': { fontSize: 16, py: 1 },
                          })}
                        />
                      )}
                      {allowedRules.length > 0 && (
                        <FormControl variant="standard" sx={{ minWidth: 70 }}>
                          <Select
                            value={getRuleFromJustification(line.justification)}
                            displayEmpty
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
                              '& .MuiSelect-select': { fontSize: 16, py: 1 },
                              '& .MuiInputBase-input': { fontSize: 16, py: 1 },
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
            <TableRow>
              <TableCell sx={{ width: 48, borderBottom: 'none' }}>
                <Tooltip title="New line">
                  <IconButton onClick={addLine} size="small" aria-label="Add line" disabled={!canAddLine}>
                    <SubdirectoryArrowRightIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ borderBottom: 'none' }}>
                <Stack direction="row" spacing={1} alignItems="center">
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
                  {SYMBOLS.map((sym) => (
                    <Chip
                      key={sym}
                      label={sym}
                      size="small"
                      variant="filled"
                      sx={{
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? alpha(theme.palette.common.white, 0.08)
                            : theme.palette.grey[100],
                        color: 'text.primary',
                        border: '1px solid',
                        borderColor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? theme.palette.grey[800]
                            : theme.palette.grey[200],
                        borderRadius: 2,
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        const targetIdx = resolveEditableIndex()
                        if (targetIdx === -1 || targetIdx === null) return
                        const inputEl = formulaRefs.current[targetIdx]
                        const current = lines[targetIdx]?.formula || ''
                        const stored =
                          typeof cursorPositionsRef.current[targetIdx] === 'number'
                            ? cursorPositionsRef.current[targetIdx]
                            : current.length
                        const start = typeof inputEl?.selectionStart === 'number' ? inputEl.selectionStart : stored
                        const end = typeof inputEl?.selectionEnd === 'number' ? inputEl.selectionEnd : start
                        if (inputEl && typeof inputEl.setRangeText === 'function') {
                          inputEl.setRangeText(sym, start, end, 'end')
                          handleLineChange(targetIdx, 'formula', inputEl.value ?? '')
                          inputEl.focus()
                          const nextCursor = start + sym.length
                          cursorPositionsRef.current[targetIdx] = nextCursor
                          setTimeout(() => inputEl.setSelectionRange(nextCursor, nextCursor), 0)
                          return
                        }
                        const { nextValue, nextCursor } = applyInsertion(current, start, end, sym)
                        handleLineChange(targetIdx, 'formula', nextValue)
                        cursorPositionsRef.current[targetIdx] = nextCursor
                        if (inputEl) {
                          inputEl.focus()
                          setTimeout(() => inputEl.setSelectionRange(nextCursor, nextCursor), 0)
                        }
                      }}
                    />
                  ))}
                </Stack>
              </TableCell>
              <TableCell sx={{ borderBottom: 'none', pl: 0.5, whiteSpace: 'nowrap' }} />
            </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {lineGateNotice.message && (
          <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
            {lineGateNotice.message}
          </Typography>
        )}

        {autoCheckEnabled && (
          <Box sx={{ mt: 2, color: 'text.secondary' }}>
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

      </ThemedCard>
      <Box sx={{ mt: 1 }}>
        <ProblemSetButtons
          onCheck={handleSubmit}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={isLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={attemptLimit}
          sx={{ mt: 1 }}
        />
      </Box>
    </Stack>
  )
}
