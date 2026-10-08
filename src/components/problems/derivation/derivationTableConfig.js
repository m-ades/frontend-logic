import { formatNumber } from "../../../utils/numberUtils.js";
import { alpha } from '@mui/material/styles'
import { formatDerivationRuleName } from '../../../lib/derivationRules.js'
import { getProofSymbolButtons } from '../../ui/logic-engine/symbolButtons.js'
import {
  PREDICATE_VARIABLES,
  getConstantLettersFromFormulasAndKey,
  getConstantLettersFromPrompt,
  getPredicateLettersFromKey,
  getPropositionalLettersFromFormulas,
  isPredicateLogicKey,
} from './derivationUtils.js'

export const AUTO_CHECK_STORAGE_KEY = 'logic-app:autocheck-enabled'
export const RULE_INPUT_MODE_KEY = 'logic-app:derivation-rule-input-mode'

export const DERIVATION_LINE_FONT_SIZE = '1.25rem'
export const DERIVATION_PROMPT_FONT_SIZE = '1.171875rem'
export const DERIVATION_CAPTION_FONT_SIZE = '0.875rem'
export const DERIVATION_SMALL_FONT_SIZE = '0.8125rem'
const DERIVATION_NUMBER_CELL_WIDTH_MOBILE = '2.25rem'
const DERIVATION_NUMBER_CELL_WIDTH_DESKTOP = '2.5rem'
export const DERIVATION_FORMULA_MIN_WIDTH = '15.625rem'
export const DERIVATION_FORMULA_WIDTH = '21.875rem'
export const DERIVATION_RULE_WIDTH_MOBILE = '4.375rem'
export const DERIVATION_RULE_WIDTH_DESKTOP = '5.46875rem'
// justification fields start at their original widths and grow with their text up to the cap
export const DERIVATION_JUSTIFICATION_MIN_WIDTH = { xs: 'calc(7ch + 4.375rem)', sm: 'calc(7ch + 5.46875rem)' }
export const DERIVATION_CITATION_MIN_WIDTH = '7ch'
export const DERIVATION_JUSTIFICATION_MAX_WIDTH = '18rem'
export const DERIVATION_INDENT_STEP_REM = 0.75
export const DERIVATION_INDENT_STEP = '0.75rem'
export const FITCH_LINE_WIDTH = '1px'

export const getFitchLineColor = (theme) => alpha(
  theme.palette.text.primary,
  theme.palette.mode === 'dark' ? 0.52 : 0.42
)

export const DERIVATION_FULLSCREEN_STACK_SX = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

export const DERIVATION_FULLSCREEN_ACTION_BAR_SX = {
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

export function getDerivationWrapperSx({ isFullScreen, hideActions }) {
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
export const getDerivationTableContainerSx = (isFullScreen) => ({
  width: '100%',
  ...(isFullScreen
    ? { overflowX: 'hidden', overflow: 'visible', padding: 0, margin: 0 }
    : { overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }),
})

// fullscreen pins the layout and drops right padding on the last column
export const getDerivationTableSx = ({ isFullScreen, isMobile }) => ({
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

export const getDerivationRowSx = (isMobile) => ({
  '& td': {
    py: isMobile ? 0.25 : 0.5,
    position: 'relative',
    verticalAlign: 'middle',
  },
})

export const getDerivationNumberCellWidthSx = (isCompact) => ({
  width: isCompact ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE : DERIVATION_NUMBER_CELL_WIDTH_DESKTOP,
  minWidth: isCompact ? DERIVATION_NUMBER_CELL_WIDTH_MOBILE : undefined,
})

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

/*
predicate mode shows predicate constant and variable rows
propositional mode shows only sentence letters with no quantifiers
*/
export function getDerivationKeyboardConfig(proof, { symbols, syntax, allowIndexedSymbols }) {
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
  const extraSymbolButtons = getProofSymbolButtons({
    symbols,
    syntax,
    allowIndexedSymbols,
    premises,
    conclusion,
  })
  const propositionalLetters = getPropositionalLettersFromFormulas(
    premises,
    conclusion,
    allowIndexedSymbols
  ) ?? []

  const isPredicate = isPredicateLogicKey(key, allowIndexedSymbols) || /[∀∃]/.test(formulaText) || /[A-Z][a-z]/.test(formulaText) || /[A-Z](?:_[1-9][0-9]*|[₁-₉][₀-₉]*)?\s*\(/.test(formulaText)

  if (!isPredicate) {
    return {
      isPredicateMode: false,
      symbolizationKey: propositionalLetters,
      extraSymbolButtons,
    }
  }

  const keyText = key.map((line) => (typeof line === 'string' ? line : String(line ?? ''))).join(' ')
  const textForConstants = [formulaText, keyText].filter(Boolean).join(' ') || ''
  const constantsFromAnswer = getConstantLettersFromFormulasAndKey(formulaText, key, allowIndexedSymbols)
  const constantLetters = [
    ...constantsFromAnswer,
    ...getConstantLettersFromPrompt(textForConstants, 3).filter((letter) => !constantsFromAnswer.includes(letter)),
  ]
  // prefer predicate letters from the key and fall back to uppercase letters in the formulas
  const fromKey = getPredicateLettersFromKey(key, allowIndexedSymbols)
  return {
    isPredicateMode: true,
    predicateLetters: fromKey.length > 0 ? fromKey : propositionalLetters,
    constantLetters,
    variableLetters: PREDICATE_VARIABLES,
    extraSymbolButtons,
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
  const maxLabel = formatNumber(pointsPerQuestion)
  const score = currentQuestionScore != null && Number.isFinite(Number(currentQuestionScore))
    ? Number(currentQuestionScore)
    : null

  if (score != null) {
    const color = score >= 100 ? 'success.main' : score > 0 ? 'text.secondary' : 'error.main'
    return { text: `${formatNumber((score / 100) * pointsPerQuestion)}/${maxLabel}`, color }
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
