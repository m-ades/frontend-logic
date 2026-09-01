import { displayLogicText } from './logicText.js'

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉'

/** Normalize display-friendly Unicode indices to Carnap-style ASCII indices. */
export function normalizeIndexedSymbols(value) {
  return String(value ?? '').replace(/([A-Za-z])_?([₀-₉]+)/g, (_match, letter, digits) => (
    `${letter}_${Array.from(digits, (digit) => SUBSCRIPT_DIGITS.indexOf(digit)).join('')}`
  ))
}

/** Render canonical indices (E_3, x_12) with Unicode subscript digits. */
export function displayIndexedSymbols(value) {
  return normalizeIndexedSymbols(value).replace(
    /([A-Za-z])_([1-9][0-9]*)/g,
    (_match, letter, digits) => letter + Array.from(
      digits, (digit) => SUBSCRIPT_DIGITS[digit]
    ).join('')
  )
}

/** Apply Fitch display notation without changing Hurley input. */
export function displayIndexedSymbolsForNotation(value, notation) {
  const displayed = notation === 'calgary' ? displayIndexedSymbols(value) : String(value ?? '')
  return displayLogicText(displayed)
}

/** A complete propositional symbol, indexed or unindexed. */
export function isPropositionalSymbol(value) {
  return /^[A-Z](?:_[1-9][0-9]*)?$/.test(normalizeIndexedSymbols(value).trim())
}

/** The leading predicate/proposition symbol from a key entry such as R_2xy. */
export function getLeadingIndexedUpperSymbol(value) {
  const match = normalizeIndexedSymbols(value).trim().match(
    /^[A-Z](?:_[1-9][0-9]*)?(?!_[0-9])/
  )
  return match ? match[0] : null
}

const uniqueMatches = (value, regex) => Array.from(new Set(
  normalizeIndexedSymbols(value).match(regex) || []
))

/** Unique uppercase symbols occurring in formula text, preserving numeric indices. */
export function getIndexedUpperSymbols(value) {
  return uniqueMatches(value, /[A-Z](?:_[1-9][0-9]*)?(?!_[0-9])/g)
}

/** Unique lowercase term symbols, preserving numeric indices. */
export function getIndexedLowerSymbols(value) {
  return uniqueMatches(value, /[a-z](?:_[1-9][0-9]*)?(?!_[0-9])/g)
}
