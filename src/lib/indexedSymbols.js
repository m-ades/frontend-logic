const SUBSCRIPT_TO_ASCII = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
}

/** Normalize display-friendly Unicode indices to Carnap-style ASCII indices. */
export function normalizeIndexedSymbols(value) {
  return String(value ?? '').replace(/([A-Za-z])_?([₀-₉]+)/g, (_match, letter, digits) => (
    `${letter}_${Array.from(digits).map((digit) => SUBSCRIPT_TO_ASCII[digit]).join('')}`
  ))
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

/** Unique uppercase symbols occurring in formula text, preserving numeric indices. */
export function getIndexedUpperSymbols(value) {
  const matches = normalizeIndexedSymbols(value).match(
    /[A-Z](?:_[1-9][0-9]*)?(?!_[0-9])/g
  ) || []
  return Array.from(new Set(matches))
}
