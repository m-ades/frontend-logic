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
import { fetchJson, getActiveUserId } from '../../../utils/api.js'
import PromptText from '../../ui/PromptText.jsx'
import ThemedCard from '../../ui/ThemedCard.jsx'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import checkDerivation from '../../../lib/logicpenguin/checkers/derivation-hurley.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { justParse } from '../../ui/logicpenguin/justification-parse.js'

const SYMBOLS = ['~', '•', '∨', '⊃', '≡', '(∀x)', '(∃x)']
const FORCE_UPPER_RULES = new Set(['UI','UG','EI','EG','MP','MT','HS','DS','CD','DN','DM','CQ','QN','CP','IP','ACP','AIP'])
const AUTO_CHECK_STORAGE_KEY = 'logic-app:autocheck-enabled'

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
  nums = nums.sort((a, b) => (a - b))
  ranges = ranges.sort(([a, b], [c, d]) => ((a - c === 0) ? b - d : a - c))
  citedrules = citedrules.map((rule) => formatRuleName(rule))
  citedrules = citedrules.sort()

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

const buildErrorRows = (errors, { skipCompletion = false } = {}) => {
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
    for (const category of Object.keys(categories)) {
      if (skipCompletion && category === 'completion') continue
      const severities = categories[category] || {}
      const descs = []
      for (const severity of Object.keys(severities)) {
        const items = severities[severity] || {}
        for (const desc of Object.keys(items)) {
          descs.push(desc)
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
    return hasLines && hasRule
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
    const errors = result?.errors || {}
    const filteredErrors = {}
    const isLineComplete = (idx) => {
      if (idx < premises.length) return true
      const line = linesSnapshot[idx] || {}
      return isLineCompleteForCheck(line)
    }
    Object.keys(errors).forEach((line) => {
      if (line !== '??') {
        const idx = Number(line) - 1
        if (Number.isFinite(idx) && !isLineComplete(idx)) {
          return
        }
      }
      const categories = errors[line] || {}
      const nextCats = {}
      Object.keys(categories).forEach((category) => {
        if (category === 'completion') return
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
      const complete = isLineComplete(idx)
      if (!complete) {
        perLine[idx] = null
        return
      }
      const hasError = Boolean(filteredErrors[lineNum] && Object.keys(filteredErrors[lineNum]).length > 0)
      perLine[idx] = hasError ? 'error' : 'ok'
    })
    const rows = buildErrorRows(filteredErrors, { skipCompletion: true })
    const normalizedConclusion = normalizeFormulaForCheck(proof?.conclusion || '')
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

  const handleLineCommit = (index, field, value) => {
    const nextLines = applyLineChange(lines, index, field, value)
    setLines(nextLines)
    emitState(nextLines)
    if (lineGateNotice.index === index) {
      setLineGateNotice({ index: null, message: '' })
    }
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
    setLines((prev) => [...prev, { formula: '', justification: '', readOnly: false }])
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
          border: '1px solid #eef1f6',
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
            {lines.map((line, idx) => (
              <TableRow key={`line-${idx}`} sx={{ '& td': { py: 0.5 } }}>
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
                    sx={{
                      width: { xs: '100%', md: 280 },
                      '& .MuiInput-underline:before': { borderBottomColor: '#e3e6ee' },
                      '& .MuiInput-underline:hover:before': { borderBottomColor: '#edf1f7' },
                      '& .MuiInput-underline:after': { borderBottomColor: '#dfe5f0' },
                      '& .MuiInputBase-input': { fontSize: 16, py: 1 },
                    }}
                  />
                </TableCell>
                <TableCell sx={{ borderBottom: 'none', width: 'auto', pl: 0.5, whiteSpace: 'nowrap' }}>
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
                      <TextField
                        variant="standard"
                        placeholder={idx === firstEditableIndex ? 'Line(s)' : ''}
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
                        sx={{
                          width: { xs: '100%', md: 58 },
                          '& .MuiInput-underline:before': { borderBottomColor: '#e3e6ee' },
                          '& .MuiInput-underline:hover:before': { borderBottomColor: '#edf1f7' },
                          '& .MuiInput-underline:after': { borderBottomColor: '#dfe5f0' },
                          '& .MuiInputBase-input': { fontSize: 16, py: 1 },
                        }}
                      />
                      {allowedRules.length > 0 && (
                        <FormControl variant="standard" sx={{ minWidth: 70 }}>
                          <Select
                            value={getRuleFromJustification(line.justification)}
                            displayEmpty
                            onChange={(e) => {
                              const nextValue = applyRuleToJustification(line.justification, e.target.value)
                              handleLineCommit(idx, 'justification', nextValue)
                            }}
                            renderValue={(value) => value || 'Rule'}
                            sx={{
                              '& .MuiSelect-select': { fontSize: 16, py: 1 },
                              '& .MuiInputBase-input': { fontSize: 16, py: 1 },
                              '& .MuiSelect-select.MuiInputBase-input': { display: 'flex', alignItems: 'center' },
                              '& .MuiInput-underline:before': { borderBottomColor: '#e3e6ee' },
                              '& .MuiInput-underline:hover:before': { borderBottomColor: '#edf1f7' },
                              '& .MuiInput-underline:after': { borderBottomColor: '#dfe5f0' },
                            }}
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
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ width: 48, borderBottom: 'none' }}>
                <IconButton onClick={addLine} size="small" aria-label="Add line" disabled={!canAddLine}>
                  <SubdirectoryArrowRightIcon />
                </IconButton>
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
                        bgcolor: '#eef1f6',
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
