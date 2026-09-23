import { formatDerivationRuleName } from '../../../lib/derivationRules.js'
import getFormulaClass from '@logic-app/logic-engine/symbolic/formula.js'
import { justParse } from '@logic-app/logic-engine/justification-parse.js'
import {
  getIndexedLowerSymbols,
  getIndexedUpperSymbols,
  getLeadingIndexedUpperSymbol,
  isPropositionalSymbol,
  normalizeIndexedSymbols,
} from '../../../lib/indexedSymbols.js'

const CONSTANT_POOL = 'abcdefghijklmnopqrstuvw'.split('')
export const PREDICATE_VARIABLES = ['x', 'y', 'z']

export function isDerivationFieldReadOnly(line, field) {
  if (!line || line.readOnly) return true
  if (field === 'formula') return Boolean(line.formulaReadOnly)
  if (field === 'justification') return Boolean(line.justificationReadOnly)
  return false
}

export function getLeftPart(line) {
  const s = typeof line === 'string' ? line : String(line ?? '')
  const idx = s.search(/[=:]/)
  return idx === -1 ? s.trim() : s.slice(0, idx).trim()
}

export function isPredicateLogicKey(symbolizationKey, allowIndexedSymbols = false) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return false
  return symbolizationKey.some((line) => {
    const left = getLeftPart(line)
    const normalizedLeft = normalizeIndexedSymbols(left)
    const isConstantStyle = allowIndexedSymbols
      ? /^[a-r](?:_[1-9][0-9]*)?$/.test(normalizedLeft)
      : /^[a-w]$/.test(left)
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

export function getConstantLettersFromFormulasAndKey(
  formulaText,
  symbolizationKey,
  allowIndexedSymbols = false
) {
  const constants = allowIndexedSymbols
    ? getIndexedLowerSymbols(formulaText).filter((term) => /^[a-r]/.test(term))
    : (formulaText.match(/[a-w]/g) || [])

  for (const line of Array.isArray(symbolizationKey) ? symbolizationKey : []) {
    const left = getLeftPart(line)
    const normalized = normalizeIndexedSymbols(left)
    const isConstant = allowIndexedSymbols
      ? /^[a-r](?:_[1-9][0-9]*)?$/.test(normalized)
      : /^[a-w]$/.test(left)
    if (isConstant) constants.push(normalized)
  }

  return Array.from(new Set(constants))
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
export const MAX_INDENT_LEVEL = 8
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

// normalizes rule shortcuts while preserving incomplete citation input
export const normalizeJustificationForDisplay = (value) => String(value ?? '').replace(/[^\s,]+/g, (token) => {
  if (/[0-9?]/.test(token)) return token
  return formatRuleName(token)
})

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

/* a scope closes only where the student discharges it, never just from a citation that would close it -
the discharge marker belongs on the line that leaves the scope (the one at the reduced depth), not on
the last line still inside it - that outside line is closed off up to (but not including) itself.
depth for a line is the open-scope stack's size right after that line's own pop/push are applied, so
one forward pass gives indentation, discharge status and discharge eligibility together */
const walkManualScopes = (linesSnapshot = [], assumptionRules = ASSUMPTION_RULES) => {
  const rangesByStart = new Map()
  const depths = new Array(linesSnapshot.length).fill(0)
  const dischargedByLine = new Array(linesSnapshot.length).fill(false)
  const eligibleByLine = new Array(linesSnapshot.length).fill(false)
  const openStack = []
  linesSnapshot.forEach((line, idx) => {
    const lineNumber = idx + 1
    eligibleByLine[idx] = openStack.length > 0
    if (line?.dischargesScope && openStack.length > 0) {
      rangesByStart.set(openStack.pop(), lineNumber - 1)
      dischargedByLine[idx] = true
    }
    const rule = getRuleFromJustification(line?.justification || '').toUpperCase()
    if (assumptionRules.has(rule)) {
      openStack.push(lineNumber)
    }
    depths[idx] = Math.min(openStack.length, MAX_INDENT_LEVEL)
  })
  openStack.forEach((startLine) => {
    if (!rangesByStart.has(startLine)) {
      rangesByStart.set(startLine, linesSnapshot.length)
    }
  })
  return { rangesByStart, depths, dischargedByLine, eligibleByLine }
}

const getManualAssumptionRanges = (linesSnapshot, assumptionRules) =>
  walkManualScopes(linesSnapshot, assumptionRules).rangesByStart

// indentation, discharge status (which line's toggle closed a scope) and discharge eligibility
// (where an open scope exists for a line to close), from the one shared walk above
export const getFitchScopeInfo = (linesSnapshot = [], assumptionRules = ASSUMPTION_RULES) => {
  const { depths, dischargedByLine, eligibleByLine } = walkManualScopes(linesSnapshot, assumptionRules)
  return { depths, dischargedByLine, eligibleByLine }
}

export const getOpenAssumptionDepths = (linesSnapshot = [], options = {}) => {
  const mode = options.mode ?? 'flat'
  const assumptionRules = options.assumptionRules ?? ASSUMPTION_RULES
  if (mode === 'nested') {
    return walkManualScopes(linesSnapshot, assumptionRules).depths
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
            // subproofs only close when the student discharges them, so a range mismatch here usually means a missing discharge
            .replace(
              'line number given for end of range not at the end of a subderivation',
              "cites this range as a closed subproof, but it hasn't been discharged there — use the discharge control to mark where the subproof actually closes"
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

const lineFromSavedProof = (line) => ({
  formula: line?.s ?? '',
  justification: line?.j ?? '',
  readOnly: false,
  dischargesScope: line?.x === true,
})

// flatten saved proof nesting for the table
const flattenProofParts = (parts = []) => {
  const lines = []
  for (const part of parts) {
    if (Array.isArray(part?.parts)) {
      lines.push(...flattenProofParts(part.parts))
    } else {
      lines.push(lineFromSavedProof(part))
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
  const lines = flattenProofParts(parts)
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

// use the same discharge-driven ranges for display and submission
const buildNestedSubderivationParts = (numbered, assumptionRules = ASSUMPTION_RULES) => {
  const byLineNumber = new Map(numbered.map((part) => [Number(part.n), part]))
  const rangesByStart = getManualAssumptionRanges(
    numbered.map((part) => ({ justification: part.j, dischargesScope: part.x === true })),
    assumptionRules
  )

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

const getCanonicalScopeMetadata = (lines) => {
  const metadata = lines.map((line) => ({
    depth: line?.scopeDepth ?? 0,
    startsScope: line?.startsScope === true,
  }))
  let previousDepth = 0
  for (const { depth, startsScope } of metadata) {
    if (!Number.isInteger(depth) || depth < 0 || depth > previousDepth + 1) return null
    if ((depth > previousDepth && !startsScope) || (startsScope && depth === 0)) return null
    previousDepth = depth
  }
  return metadata
}

const buildCanonicalSubderivationParts = (numbered, lines) => {
  const metadata = getCanonicalScopeMetadata(lines)
  if (!metadata) return null
  const root = []
  const stack = [root]
  numbered.forEach((part, index) => {
    const { depth, startsScope } = metadata[index]
    while (stack.length - 1 > depth) stack.pop()
    if (startsScope && stack.length - 1 === depth) stack.pop()
    while (stack.length - 1 < depth) {
      const subproof = { parts: [] }
      stack.at(-1).push(subproof)
      stack.push(subproof.parts)
    }
    stack.at(-1).push(part)
  })
  return root
}

// canonical scope metadata applies only when explicitly enabled for fixed proof lines
// each line provides a nonnegative scope depth and marks every scope start
// invalid metadata produces an empty proof
export const buildSubmission = (lines, conclusion, premises, normalizeFormula, normalizeJustification, options = {}) => {
  const numbered = lines.map((line, idx) => ({
    n: String(idx + 1),
    s: normalizeFormula(line.formula ?? ''),
    j: idx < premises.length ? 'Pr' : normalizeJustification(line.justification ?? ''),
    ...(idx >= premises.length && line.dischargesScope ? { x: true } : {}),
  }))
  const canonicalParts = options.canonicalScopes
    ? buildCanonicalSubderivationParts(numbered, lines)
    : null
  const parts = options.nestedSubderivations
    ? (options.canonicalScopes
        ? (canonicalParts ?? [])
        : buildNestedSubderivationParts(numbered, options.assumptionRules))
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
