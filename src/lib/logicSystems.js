export const DEFAULT_LOGIC_SYSTEM = 'fitch'
export const LEGACY_LOGIC_SYSTEM = 'hurley'

export const LOGIC_SYSTEMS = {
  fitch: {
    id: 'fitch',
    label: 'Fitch',
    derivationSystem: 'calgary',
    symbols: {
      not: '¬',
      and: '∧',
      or: '∨',
      conditional: '→',
      biconditional: '↔',
      forall: '∀',
      exists: '∃',
    },
  },
  hurley: {
    id: 'hurley',
    label: 'Hurley',
    derivationSystem: 'hurley',
    symbols: {
      not: '~',
      and: '•',
      or: '∨',
      conditional: '⊃',
      biconditional: '≡',
      forall: '∀',
      exists: '∃',
    },
  },
}

export function isLogicSystem(value) {
  return typeof value === 'string' && value in LOGIC_SYSTEMS
}

export function normalizeLogicSystem(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  return isLogicSystem(value) ? value : fallback
}

export function getLogicSystem(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  return LOGIC_SYSTEMS[normalizeLogicSystem(value, fallback)]
}

export function getDerivationProblemType(value, fallback = DEFAULT_LOGIC_SYSTEM) {
  return `derivation-${getLogicSystem(value, fallback).derivationSystem}`
}

export function getLogicSystemOptions() {
  return Object.keys(LOGIC_SYSTEMS).map((id) => ({
    id,
    label: LOGIC_SYSTEMS[id].label,
  }))
}
