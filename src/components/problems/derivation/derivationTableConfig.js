import { alpha } from '@mui/material/styles'
import { formatDerivationRuleName } from '../../../lib/derivationRules.js'
import {
  displayIndexedSymbolsForNotation,
  normalizeIndexedSymbols,
} from '../../../lib/indexedSymbols.js'

export const AUTO_CHECK_STORAGE_KEY = 'logic-app:autocheck-enabled'
export const RULE_INPUT_MODE_KEY = 'logic-app:derivation-rule-input-mode'

export const DERIVATION_LINE_FONT_SIZE = '1.25rem'
export const DERIVATION_NUMBER_CELL_WIDTH_MOBILE = '2.25rem'
export const DERIVATION_NUMBER_CELL_WIDTH_DESKTOP = '2.5rem'
export const DERIVATION_FORMULA_MIN_WIDTH = '15.625rem'
export const DERIVATION_FORMULA_WIDTH = '21.875rem'
export const DERIVATION_RULE_WIDTH_MOBILE = '4.375rem'
export const DERIVATION_RULE_WIDTH_DESKTOP = '5.46875rem'
export const DERIVATION_JUSTIFICATION_WIDTH_XS = 'calc(7ch + 4.375rem)'
export const DERIVATION_JUSTIFICATION_WIDTH_SM = 'calc(7ch + 5.46875rem)'
export const DERIVATION_INDENT_STEP_REM = 0.75
export const DERIVATION_INDENT_STEP = '0.75rem'
export const FITCH_LINE_WIDTH = '1px'

export const getFitchLineColor = (theme) => alpha(
  theme.palette.text.primary,
  theme.palette.mode === 'dark' ? 0.52 : 0.42
)

export function parseRulesetRules(value, derivationRuleLookup) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(/[,\s]+/g)
  const rules = []
  const seen = new Set()
  let hasEntries = false

  for (const entry of source) {
    const raw = String(entry ?? '').trim()
    if (!raw) continue
    hasEntries = true
    const rule = derivationRuleLookup.get(formatDerivationRuleName(raw).toLowerCase())
    if (!rule || rule.toLowerCase() === 'pr' || seen.has(rule.toLowerCase())) continue
    seen.add(rule.toLowerCase())
    rules.push(rule)
  }

  return { rules, hasEntries }
}

export function getQuantifierButtonsFromFormulas(premises, conclusion, syntax) {
  const text = [...(Array.isArray(premises) ? premises : []), conclusion]
    .filter(Boolean)
    .join(' ')
  const seen = new Set([
    syntax.mkquantifier('x', syntax.symbols.FORALL),
    syntax.mkquantifier('x', syntax.symbols.EXISTS),
  ])
  const buttons = []

  for (const [, variable] of normalizeIndexedSymbols(text).matchAll(/[∀∃]([s-z](?:_[1-9][0-9]*)?)/g)) {
    for (const quantifier of [syntax.symbols.FORALL, syntax.symbols.EXISTS]) {
      const insert = displayIndexedSymbolsForNotation(
        syntax.mkquantifier(variable, quantifier),
        syntax.notationname
      )
      if (!seen.has(insert)) {
        seen.add(insert)
        buttons.push({ label: insert, insert })
      }
    }
  }

  return buttons
}

export const getSymbolButtons = (symbols, syntax) => [
  { label: symbols.not, insert: symbols.not },
  { label: symbols.and, insert: symbols.and },
  { label: symbols.or, insert: symbols.or },
  { label: symbols.conditional, insert: symbols.conditional },
  { label: symbols.biconditional, insert: symbols.biconditional },
  ...[syntax.symbols.FORALL, syntax.symbols.EXISTS].map((quantifier) => {
    const symbol = syntax.mkquantifier('x', quantifier)
    return { label: symbol, insert: symbol }
  }),
  { label: '(  )', pair: '()' },
  { label: '[  ]', pair: '[]' },
]

export const symbolButtonSx = (isFullScreen, isPhone) => {
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
    bgcolor: (theme) => theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.08)
      : theme.palette.grey[100],
    color: 'text.primary',
    '&:hover': (theme) => ({
      boxShadow: 'none',
      border: 'none',
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
    }),
  }
}

export function applyInsertion(value, selectionStart, selectionEnd, insertText, replaceBefore = 0) {
  const start = selectionStart ?? value.length
  const end = selectionEnd ?? start
  const before = value.slice(0, Math.max(0, start - replaceBefore))
  return {
    nextValue: before + insertText + value.slice(end),
    nextCursor: before.length + insertText.length,
  }
}

export function getDerivationScoreLabel({
  attemptCount,
  attemptLimit,
  currentQuestionScore,
  isCurrentCorrect,
  lastSubmitStatus,
  totalQuestions,
}) {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return null
  const pointsPerQuestion = 100 / totalQuestions
  const formatPoints = (points) => points % 1 === 0
    ? String(Math.round(points))
    : points.toFixed(1)
  const maxLabel = formatPoints(pointsPerQuestion)
  const score = currentQuestionScore != null && Number.isFinite(Number(currentQuestionScore))
    ? Number(currentQuestionScore)
    : null

  if (score != null) {
    const color = score >= 100 ? 'success.main' : score > 0 ? 'text.secondary' : 'error.main'
    return { text: `${formatPoints((score / 100) * pointsPerQuestion)}/${maxLabel}`, color }
  }
  if (lastSubmitStatus === 'correct') {
    return { text: `${maxLabel}/${maxLabel}`, color: 'success.main' }
  }
  if (lastSubmitStatus === 'incorrect') {
    return { text: `0/${maxLabel}`, color: 'error.main' }
  }
  if (isCurrentCorrect) {
    return { text: `${maxLabel}/${maxLabel}`, color: 'success.main' }
  }
  const isLocked = Number.isFinite(attemptLimit) && attemptCount >= attemptLimit
  if (isLocked) {
    return { text: `0/${maxLabel}`, color: 'error.main' }
  }
  return null
}
