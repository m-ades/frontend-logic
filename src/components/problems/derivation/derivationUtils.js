import { alpha } from '@mui/material/styles'
import { formatDerivationRuleName } from '../../../lib/derivationRules.js'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { justParse } from '../../ui/logicpenguin/justification-parse.js'
import {
  getIndexedUpperSymbols,
  getLeadingIndexedUpperSymbol,
  isPropositionalSymbol,
} from '../../../lib/indexedSymbols.js'

const CONSTANT_POOL = 'abcdefghijklmnopqrstuvw'.split('')
export const PREDICATE_VARIABLES = ['x', 'y', 'z']

export function getLeftPart(line) {
  const s = typeof line === 'string' ? line : String(line ?? '')
  const idx = s.search(/[=:]/)
  return idx === -1 ? s.trim() : s.slice(0, idx).trim()
}

export function isPredicateLogicKey(symbolizationKey, allowIndexedSymbols = false) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return false
  return symbolizationKey.some((line) => {
    const left = getLeftPart(line)
    const isConstantStyle =
      left.length === 1 && /^[a-z]$/.test(left) && !['x', 'y', 'z'].includes(left)
    const isPredicateStyle = /^[A-Z]/.test(left) && left.length > 1 && !(
      allowIndexedSymbols && isPropositionalSymbol(left)
    )
    return isConstantStyle || isPredicateStyle
  })
}

export function getPredicateLettersFromKey(symbolizationKey, allowIndexedSymbols = false) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return []
  const seen = new Set()
  return symbolizationKey
    .map((line) => {
      const left = getLeftPart(line)
      if (allowIndexedSymbols) return getLeadingIndexedUpperSymbol(left)
      const match = left.match(/^[A-Z]+/)
      return match ? match[0] : null
    })
    .filter((letter) => letter && !seen.has(letter) && (seen.add(letter), true))
}

export function getConstantLettersFromPrompt(promptText, count = 3) {
  if (!promptText || typeof promptText !== 'string') {
    return CONSTANT_POOL.slice(0, count)
  }
  const text = promptText.replace(/<[^>]+>/g, ' ').toLowerCase()
  const used = new Set(text.match(/[a-z]/g) || [])
  const result = []
  for (const c of CONSTANT_POOL) {
    if (!used.has(c)) {
      result.push(c)
      if (result.length >= count) break
    }
  }
  return result.length > 0 ? result : ['a', 'b', 'c']
}

export function getPropositionalLettersFromFormulas(
  premises,
  conclusion,
  allowIndexedSymbols = false
) {
  const formulas = [...(Array.isArray(premises) ? premises : []), conclusion].filter(Boolean).map(String)
  const text = formulas.join(' ')
  const letters = allowIndexedSymbols
    ? getIndexedUpperSymbols(text)
    : Array.from(new Set(text.match(/[A-Z]/g) || []))
  return letters.length > 0 ? letters : null
}

export const HURLEY_ASSUMPTION_RULES = new Set(['ACP', 'AIP'])
export const FITCH_ASSUMPTION_RULES = new Set(['AS', 'HYP'])
export const ASSUMPTION_RULES = new Set([...HURLEY_ASSUMPTION_RULES, ...FITCH_ASSUMPTION_RULES])
export const INDENT_END_RULES = new Set(['CP', 'IP'])
export const INDENT_PX = 18
export const ASSUMPTION_INDENT_PX = 12
export const MAX_INDENT_LEVEL = 3
export const AUTO_CHECK_STORAGE_KEY = 'logic-app:autocheck-enabled'
export const RULE_INPUT_MODE_KEY = 'logic-app:derivation-rule-input-mode'
export const MOBILE_DERIVATION_PLACEHOLDER_MSG = 'Tap to open proof'

export function formulasEqualNormally(a, b, normalizeForFallback, notation) {
  if (!a && !b) return true
  if (!a || !b) return false
  try {
    const Formula = getFormulaClass(notation)
    return Formula.from(String(a)).normal === Formula.from(String(b)).normal
  } catch {
    return normalizeForFallback ? normalizeForFallback(a) === normalizeForFallback(b) : false
  }
}

export const symbolBtnSx = (isFullScreen, isMobile, isPhone) => {
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

export const plainIconButtonSx = {
  p: 0.25,
  borderRadius: 0,
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: 'transparent',
  },
  '&.Mui-disabled': {
    backgroundColor: 'transparent',
  },
}

export const getUnderlineColors = (theme) => {
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

export const getInputUnderlineSx = (theme) => {
  const colors = getUnderlineColors(theme)
  return {
    '& .MuiInput-underline:before': { borderBottomColor: colors.base },
    '& .MuiInput-underline:hover:before': { borderBottomColor: colors.hover },
    '& .MuiInput-underline:after': { borderBottomColor: colors.focus },
  }
}

export const getSelectUnderlineSx = (theme) => {
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

export const applyInsertion = (value, selectionStart, selectionEnd, insertText, replaceBefore = 0) => {
  const start = selectionStart ?? value.length
  const end = selectionEnd ?? start
  const before = value.slice(0, Math.max(0, start - replaceBefore))
  const after = value.slice(end)
  const nextValue = before + insertText + after
  const nextCursor = before.length + insertText.length
  return { nextValue, nextCursor }
}

export const formatRuleName = (rule) => {
  return formatDerivationRuleName(rule)
}

export const formatJustificationParts = (nums, ranges, citedrules, options = {}) => {
  const formattedRules = citedrules.map((rule) => formatRuleName(rule))
  const refs = nums.map((n) => n.toString())
  if (ranges.length > 0) {
    refs.push(...ranges.map(([s, e]) => `${s}–${e}`))
  }
  const refsText = refs.join(', ')
  const rulesText = formattedRules.join(', ')
  if (options.rulesFirst) {
    return [rulesText, refsText].filter(Boolean).join(' ')
  }
  return [refsText, rulesText].filter(Boolean).join(' ')
}

export const formatJustificationDisplay = (value, options = {}) => {
  if (!value) return ''
  const { nums, ranges, citedrules } = justParse(String(value))
  return formatJustificationParts(nums, ranges, citedrules, options)
}

export const getJustificationMeta = (value) => {
  const { nums, ranges, citedrules } = justParse(String(value || ''))
  return {
    hasLines: nums.length > 0 || ranges.length > 0,
    hasRule: Array.isArray(citedrules) && citedrules.length > 0,
  }
}

export const formatJustificationLines = (value) => {
  if (!value) return ''
  const { nums, ranges } = justParse(String(value || ''))
  return formatJustificationParts(nums, ranges, [])
}

export const applyRuleToJustification = (value, rule, options = {}) => {
  const { nums, ranges } = justParse(String(value || ''))
  const nextRules = rule ? [rule] : []
  return formatJustificationParts(nums, ranges, nextRules, options)
}

export const applyLinesToJustification = (value, linesInput, options = {}) => {
  const existingRule = getRuleFromJustification(value)
  const { nums, ranges } = justParse(String(linesInput || ''))
  return formatJustificationParts(nums, ranges, existingRule ? [existingRule] : [], options)
}

export const getRuleFromJustification = (value) => {
  const { citedrules } = justParse(String(value || ''))
  if (!Array.isArray(citedrules) || citedrules.length === 0) return ''
  return formatRuleName(citedrules[0])
}

const getCitedAssumptionRanges = (
  linesSnapshot = [],
  assumptionRules = ASSUMPTION_RULES,
  { keepUnclosedOpen = false } = {}
) => {
  const rangesByStart = new Map()
  linesSnapshot.forEach((line, idx) => {
    const lineNumber = idx + 1
    const { ranges } = justParse(String(line?.justification || ''))
    ranges.forEach(([start, end]) => {
      if (!Number.isFinite(start) || !Number.isFinite(end)) return
      if (start >= end || end >= lineNumber) return
      const startLine = linesSnapshot[start - 1]
      const startRule = getRuleFromJustification(startLine?.justification || '').toUpperCase()
      if (!assumptionRules.has(startRule)) return
      const currentEnd = rangesByStart.get(start)
      if (!currentEnd || end > currentEnd) {
        rangesByStart.set(start, end)
      }
    })
  })
  if (keepUnclosedOpen) {
    linesSnapshot.forEach((line, idx) => {
      const lineNumber = idx + 1
      const rule = getRuleFromJustification(line?.justification || '').toUpperCase()
      if (!assumptionRules.has(rule)) return
      if (rangesByStart.has(lineNumber)) return
      rangesByStart.set(lineNumber, linesSnapshot.length)
    })
  }
  return rangesByStart
}

export const getOpenAssumptionDepths = (linesSnapshot = [], options = {}) => {
  const mode = options.mode ?? 'flat'
  const assumptionRules = options.assumptionRules ?? ASSUMPTION_RULES
  if (mode === 'nested') {
    const rangesByStart = getCitedAssumptionRanges(linesSnapshot, assumptionRules, {
      keepUnclosedOpen: true,
    })
    return linesSnapshot.map((_, idx) => {
      const lineNumber = idx + 1
      let depth = 0
      rangesByStart.forEach((end, start) => {
        if (lineNumber >= start && lineNumber <= end) {
          depth += 1
        }
      })
      return Math.min(depth, MAX_INDENT_LEVEL)
    })
  }
  let depth = 0
  return linesSnapshot.map((line) => {
    const rule = getRuleFromJustification(line?.justification || '').toUpperCase()
    // cp and ip close before their own line lands
    if (INDENT_END_RULES.has(rule)) {
      depth = Math.max(0, depth - 1)
    }
    if (assumptionRules.has(rule)) {
      depth = Math.min(depth + 1, MAX_INDENT_LEVEL)
    }
    return depth
  })
}

export const isResolvedConclusionLine = ({
  line,
  index,
  conclusion,
  normalizeFormula,
  notation,
  openAssumptionDepths,
}) => {
  if (!line || !String(conclusion || '').trim() || !Number.isInteger(index)) return false
  if (!formulasEqualNormally(line.formula || '', conclusion, normalizeFormula, notation)) return false
  // a matching formula inside an open assumption does not end the proof
  return (openAssumptionDepths?.[index] ?? 0) === 0
}

export const buildErrorRows = (errors, linesSnapshot = [], { skipCompletion = false } = {}) => {
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
          const displayDesc = String(desc || '')
            .replace(/^syntax error:\s*/i, '')
            .replace(
              'formulas must start with an uppercase predicate letter (A–Z) or =/≠; lowercase predicates are not accepted.',
              'derivations must start with an uppercase predicate letter (A–Z); lowercase predicates are not accepted.'
            )
          if (lineRule && INDENT_END_RULES.has(lineRule) && displayDesc === 'cites the wrong number of subderivation line ranges for the rule specified') {
            descs.push(`${displayDesc} (e.g. 3-9)`)
          } else {
            descs.push(displayDesc)
          }
        }
      }
      if (descs.length === 0) continue
      const isWarning = category === 'dependency'
      const baseLabel = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
      entries.push({
        label: isWarning ? 'Warning' : `${baseLabel} ${descs.length === 1 ? 'error' : 'errors'}`,
        messages: descs,
        isWarning,
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

// flatten saved lp nesting for the table
const flattenLPParts = (parts = []) => {
  const lines = []
  for (const part of parts) {
    if (Array.isArray(part?.parts)) {
      lines.push(...flattenLPParts(part.parts))
    } else {
      lines.push(lineFromLP(part))
    }
  }
  return lines
}

export const extractLines = (savedState, premises = []) => {
  if (!savedState) {
    return []
  }
  const ans = savedState?.ans ?? savedState
  const first = Array.isArray(ans?.parts) ? ans.parts[0] : null
  if (!first) return []
  const parts = Array.isArray(first.parts) ? first.parts : []
  const lines = flattenLPParts(parts)
  const savedPremiseCount = Array.isArray(ans?.prems) ? ans.prems.length : premises.length
  if (premises.length || savedPremiseCount) {
    const premLines = premises.map((premise) => ({ formula: premise, justification: '', readOnly: true }))
    const savedEditableLines = lines.slice(savedPremiseCount)
    const editableLines = savedEditableLines.length
      ? savedEditableLines
      : [{ formula: '', justification: '', readOnly: false }]
    return [
      ...premLines,
      ...editableLines.map((line) => ({ ...line, readOnly: false })),
    ]
  }
  return lines
}

// rebuild lp nesting from cited ranges
const buildNestedSubderivationParts = (numbered, assumptionRules = ASSUMPTION_RULES) => {
  const byLineNumber = new Map(numbered.map((part) => [Number(part.n), part]))
  const rangesByStart = new Map()

  // only assumption ranges open subderivations
  for (const part of numbered) {
    const lineNumber = Number(part.n)
    const { ranges } = justParse(String(part.j || ''))
    for (const [start, end] of ranges) {
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue
      if (start >= end || end >= lineNumber) continue
      const startPart = byLineNumber.get(start)
      const startRule = getRuleFromJustification(startPart?.j || '').toUpperCase()
      if (!assumptionRules.has(startRule)) continue
      const currentEnd = rangesByStart.get(start)
      if (!currentEnd || end > currentEnd) {
        rangesByStart.set(start, end)
      }
    }
  }
  for (const part of numbered) {
    const lineNumber = Number(part.n)
    const rule = getRuleFromJustification(part?.j || '').toUpperCase()
    if (!Number.isFinite(lineNumber) || !assumptionRules.has(rule)) continue
    if (rangesByStart.has(lineNumber)) continue
    rangesByStart.set(lineNumber, Number(numbered[numbered.length - 1]?.n ?? lineNumber))
  }

  const buildRange = (startLine, endLine, wrappedStartLine = null) => {
    const parts = []
    let lineNumber = startLine
    while (lineNumber <= endLine) {
      const nestedEnd = rangesByStart.get(lineNumber)
      if (nestedEnd && nestedEnd <= endLine && lineNumber !== wrappedStartLine) {
        parts.push({ parts: buildRange(lineNumber, nestedEnd, lineNumber) })
        lineNumber = nestedEnd + 1
        continue
      }
      const part = byLineNumber.get(lineNumber)
      if (part) parts.push(part)
      lineNumber += 1
    }
    return parts
  }

  if (numbered.length === 0) return []
  return buildRange(Number(numbered[0].n), Number(numbered[numbered.length - 1].n))
}

export const buildSubmission = (lines, conclusion, premises, normalizeFormula, normalizeJustification, options = {}) => {
  const numbered = lines.map((line, idx) => ({
    n: String(idx + 1),
    s: normalizeFormula(line.formula ?? ''),
    j: idx < premises.length ? 'Pr' : normalizeJustification(line.justification ?? ''),
  }))
  const parts = options.nestedSubderivations
    ? buildNestedSubderivationParts(numbered, options.assumptionRules)
    : numbered
  return {
    ans: {
      parts: [
        {
          showline: { s: normalizeFormula(conclusion || ''), j: '', isMainConclusion: true, n: '' },
          parts,
        },
      ],
      prems: premises,
      conc: normalizeFormula(conclusion || ''),
    },
  }
}
