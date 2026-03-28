const CONSTANT_POOL = 'abcdefghijklmnopqrstuvw'.split('')
export const PREDICATE_VARIABLES = ['x', 'y', 'z']

export function getLeftPart(line) {
  const s = typeof line === 'string' ? line : String(line ?? '')
  const idx = s.search(/[=:]/)
  return idx === -1 ? s.trim() : s.slice(0, idx).trim()
}

export function isPredicateLogicKey(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return false
  return symbolizationKey.some((line) => {
    const left = getLeftPart(line)
    const isConstantStyle =
      left.length === 1 && /^[a-z]$/.test(left) && !['x', 'y', 'z'].includes(left)
    const isPredicateStyle = left.length > 1 && /^[A-Z]/.test(left)
    return isConstantStyle || isPredicateStyle
  })
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

export function getConstantLettersFromPromptAndKey(promptText, symbolizationKey, count = 3) {
  const prompt = typeof promptText === 'string' ? promptText : String(promptText ?? '')
  const keyText = Array.isArray(symbolizationKey)
    ? symbolizationKey.map((line) => (typeof line === 'string' ? line : String(line ?? ''))).join(' ')
    : ''
  const combined = [prompt, keyText].filter(Boolean).join(' ')
  if (!combined) return CONSTANT_POOL.slice(0, count)
  const text = combined.replace(/<[^>]+>/g, ' ').toLowerCase()
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

export function getPropositionalLettersFromFormulas(premises, conclusion) {
  const formulas = [...(Array.isArray(premises) ? premises : []), conclusion].filter(Boolean).map(String)
  const text = formulas.join(' ')
  const letters = []
  const seen = new Set()
  const match = text.match(/[A-Z]/g)
  if (match) {
    for (const char of match) {
      if (!seen.has(char)) {
        seen.add(char)
        letters.push(char)
      }
    }
  }
  return letters.length > 0 ? letters : null
}
