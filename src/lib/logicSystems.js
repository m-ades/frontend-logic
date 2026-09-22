export const DEFAULT_LOGIC_SYSTEM = 'fitch'
export const LEGACY_LOGIC_SYSTEM = 'hurley'

export const LOGIC_SYSTEMS = {
  fitch: {
    id: 'fitch',
    label: 'Fitch',
    notation: 'calgary',
    derivationSystem: 'calgary',
    derivationProblemType: 'derivation-calgary',
    symbols: {
      not: '¬',
      and: '∧',
      or: '∨',
      conditional: '→',
      biconditional: '↔︎',
      forall: '∀',
      exists: '∃',
      falsum: '⊥',
    },
  },
  hurley: {
    id: 'hurley',
    label: 'Hurley',
    notation: 'hurley',
    derivationSystem: 'hurley',
    derivationProblemType: 'derivation-hurley',
    symbols: {
      not: '~',
      and: '•',
      or: '∨',
      conditional: '⊃',
      biconditional: '≡',
      forall: '∀',
      exists: '∃',
      falsum: '✖',
    },
  },
}

/** Historical / notation-style aliases → canonical system ids (fitch ≈ calgary/forallx glyphs). */
const LOGIC_SYSTEM_ALIASES = {
  calgary: 'fitch',
  forallx: 'fitch',
  'forall-x': 'fitch',
}

export function isLogicSystem(value) {
  return typeof value === 'string' && value in LOGIC_SYSTEMS
}

export function normalizeLogicSystem(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  if (typeof value !== 'string') return fallback
  // tolerate inconsistent casing
  const lowered = value.toLowerCase()
  if (isLogicSystem(lowered)) return lowered
  const aliased = LOGIC_SYSTEM_ALIASES[lowered]
  return aliased && isLogicSystem(aliased) ? aliased : fallback
}

export function getLogicSystem(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  return LOGIC_SYSTEMS[normalizeLogicSystem(value, fallback)]
}

export function getDerivationProblemType(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  return getLogicSystem(value, fallback).derivationProblemType
}

export function getNotation(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  return getLogicSystem(value, fallback).notation
}

export function getSymbols(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  return getLogicSystem(value, fallback).symbols
}

export function isDerivationProblemType(value) {
  return value === 'derivation' || value === 'derivation-hurley' || value === 'derivation-calgary'
}

export function getLogicSystemOptions() {
  return Object.keys(LOGIC_SYSTEMS).map((id) => ({
    id,
    label: LOGIC_SYSTEMS[id].label,
  }))
}
