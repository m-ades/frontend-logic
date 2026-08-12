import {
  getIndexedUpperSymbols,
  getLeadingIndexedUpperSymbol,
  isPropositionalSymbol,
  normalizeIndexedSymbols,
} from '../../../../lib/indexedSymbols.js'

// Predicate / propositional helpers for symbolization keys.
// Key can use "=" or ":" (e.g. "Mx: x is a musician", "a = Alice", "P = It is raining").
// Fitch propositional keys may use numeric indices (P, E_1, E₁).
// Other systems retain the legacy single-letter propositional grammar.
// Predicate keys: constants (a, b) and/or predicate-plus-variables (Mx, Pxy).
export function getLeftPart(line) {
  const s = typeof line === 'string' ? line : String(line ?? '')
  const idx = s.search(/[=:]/)
  return idx === -1 ? s.trim() : s.slice(0, idx).trim()
}

export function isPredicateLogicKey(symbolizationKey, allowIndexedSymbols = false) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return false
  return symbolizationKey.some((line) => {
    const left = getLeftPart(line)
    // Constant: single lowercase a–w (e.g. "a = Alice")
    const isConstantStyle =
      left.length === 1 && /^[a-z]$/.test(left) && !['x', 'y', 'z'].includes(left)
    // Indexed sentence letters such as E_1/E₁ are still propositional atoms.
    const isPredicateStyle = /^[A-Z]/.test(left) && !(
      allowIndexedSymbols && isPropositionalSymbol(left)
    ) && (left.length > 1)
    return isConstantStyle || isPredicateStyle
  })
}

export function promptImpliesPredicateLogic(promptText) {
  const prompt = typeof promptText === 'string' ? promptText : String(promptText ?? '')
  const text = prompt.replace(/<[^>]+>/g, ' ').toLowerCase()
  return /\bpredicate logic\b/.test(text)
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

/** Constants from key: lines whose left part is a single lowercase letter (a–w, not x,y,z). */
export function getConstantLettersFromKey(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return []
  const result = []
  const seen = new Set()
  for (const line of symbolizationKey) {
    const left = getLeftPart(line)
    if (
      left.length === 1 &&
      /^[a-z]$/.test(left) &&
      !['x', 'y', 'z'].includes(left) &&
      !seen.has(left)
    ) {
      seen.add(left)
      result.push(left)
    }
  }
  return result
}

export const ST_CONSTANT_POOL = 'abcdefghijklmnopqrstuvw'.split('') // exclude x,y,z
export const ST_PREDICATE_VARIABLES = ['x', 'y', 'z']

export function getConstantLettersFromPromptAndKey(promptText, symbolizationKey, count = 3) {
  const prompt = typeof promptText === 'string' ? promptText : String(promptText ?? '')
  const keyText = Array.isArray(symbolizationKey)
    ? symbolizationKey.map((line) => (typeof line === 'string' ? line : String(line ?? ''))).join(' ')
    : ''
  const combined = [prompt, keyText].filter(Boolean).join(' ')
  if (!combined) return ST_CONSTANT_POOL.slice(0, count)
  const text = combined.replace(/<[^>]+>/g, ' ').toLowerCase()
  const used = new Set(text.match(/[a-z]/g) || [])
  const result = []
  for (const c of ST_CONSTANT_POOL) {
    if (!used.has(c)) {
      result.push(c)
      if (result.length >= count) break
    }
  }
  return result.length > 0 ? result : ['a', 'b', 'c']
}

const unique = (items) => Array.from(new Set(items.filter(Boolean)))

export function getFormulaKeyboardConfig(formulas, allowIndexedSymbols = false) {
  const formulaText = (Array.isArray(formulas) ? formulas : []).map(String).join(' ')
  if (!formulaText.trim()) return null
  const predicateLetters = allowIndexedSymbols
    ? getIndexedUpperSymbols(formulaText)
    : unique(formulaText.match(/[A-Z]/g) || [])
  const constantLetters = unique(formulaText.match(/[a-w]/g) || [])
  const variableLetters = unique(formulaText.match(/[x-z]/g) || [])
  const isPredicate =
    constantLetters.length > 0 ||
    variableLetters.length > 0 ||
    /[∀∃]/.test(formulaText) ||
    /[A-Z][a-z]/.test(formulaText)

  return isPredicate
    ? {
        isPredicateMode: true,
        predicateLetters,
        constantLetters,
        variableLetters,
      }
    : {
        isPredicateMode: false,
        symbolizationKey: predicateLetters,
      }
}

export function parseSymbolizationKeyFromPrompt(promptText, allowIndexedSymbols = false) {
  if (!promptText || typeof promptText !== 'string') return []
  const text = promptText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
  const keyMatch = text.match(/symbolization key\s*:?\s*([\s\S]*)/i)
  if (!keyMatch) return []
  if (!allowIndexedSymbols) {
    return Array.from(keyMatch[1].matchAll(/\b[A-Za-z]+\s*[=:]/g))
      .map((match) => match[0])
  }
  return Array.from(
    keyMatch[1].matchAll(
      /\b[A-Za-z]+(?:_[1-9][0-9]*|[₁-₉][₀-₉]*)?\s*[=:]/g
    )
  ).map((match) => normalizeIndexedSymbols(match[0]))
}
