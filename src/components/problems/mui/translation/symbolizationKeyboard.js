// Predicate / propositional helpers for symbolization keys.
// Key can use "=" or ":" (e.g. "Mx: x is a musician", "a = Alice", "P = It is raining").
// Propositional keys: single uppercase letters only (P, Q, R). Predicate keys: constants (a, b)
// and/or predicate-plus-variables (Mx, Pxy).
export function getLeftPart(line) {
  const s = typeof line === 'string' ? line : String(line ?? '')
  const idx = s.search(/[=:]/)
  return idx === -1 ? s.trim() : s.slice(0, idx).trim()
}

export function isPredicateLogicKey(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return false
  return symbolizationKey.some((line) => {
    const left = getLeftPart(line)
    // Constant: single lowercase a–w (e.g. "a = Alice")
    const isConstantStyle =
      left.length === 1 && /^[a-z]$/.test(left) && !['x', 'y', 'z'].includes(left)
    // Predicate form: starts with uppercase and has more than one char (e.g. Mx, Pxy), not single P/Q/R
    const isPredicateStyle = left.length > 1 && /^[A-Z]/.test(left)
    return isConstantStyle || isPredicateStyle
  })
}

export function promptImpliesPredicateLogic(promptText) {
  const prompt = typeof promptText === 'string' ? promptText : String(promptText ?? '')
  const text = prompt.replace(/<[^>]+>/g, ' ').toLowerCase()
  return /\bpredicate logic\b/.test(text)
}

export function getPredicateLettersFromKey(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return []
  const seen = new Set()
  return symbolizationKey
    .map((line) => {
      const left = getLeftPart(line)
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

export function getFormulaKeyboardConfig(formulas) {
  const formulaText = (Array.isArray(formulas) ? formulas : []).map(String).join(' ')
  if (!formulaText.trim()) return null
  const predicateLetters = unique(formulaText.match(/[A-Z]/g) || [])
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

export function parseSymbolizationKeyFromPrompt(promptText) {
  if (!promptText || typeof promptText !== 'string') return []
  const text = promptText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
  const keyMatch = text.match(/symbolization key\s*:?\s*([\s\S]*)/i)
  if (!keyMatch) return []
  return Array.from(keyMatch[1].matchAll(/\b[A-Za-z]+\s*[=:]/g)).map((match) => match[0])
}
