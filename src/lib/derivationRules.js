import getHurleyRuleset from './logicpenguin/checkers/rules/hurley-rules.js'
import getForallxRuleset from './logicpenguin/checkers/rules/forallx-rules.js'
import { DEFAULT_LOGIC_SYSTEM, getDerivationProblemType } from './logicSystems.js'

export const FORCE_UPPER_DERIVATION_RULES = new Set([
  'UI',
  'UG',
  'EI',
  'EG',
  'MP',
  'MT',
  'HS',
  'DS',
  'CD',
  'DN',
  'DM',
  'QN',
  'CP',
  'IP',
  'ACP',
  'AIP',
  'PR',
])

export function formatDerivationRuleName(rule) {
  const raw = String(rule || '')
  const upper = raw.toUpperCase()
  if (FORCE_UPPER_DERIVATION_RULES.has(upper)) return upper
  const lower = raw.toLowerCase()
  return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : ''
}

function getRuleNames(ruleset) {
  return Object.keys(ruleset)
    .filter((rule) => rule !== 'Pr' && rule !== 'Ass' && rule !== 'Hyp')
    .filter((rule) => !ruleset[rule]?.hidden)
    .map((rule) => formatDerivationRuleName(rule))
}

const DERIVATION_RULES_BY_TYPE = {
  'derivation-hurley': getRuleNames(getHurleyRuleset()),
  'derivation-calgary': getRuleNames(getForallxRuleset('calgary', 'calgary')),
}

const DERIVATION_RULE_LOOKUPS_BY_TYPE = Object.fromEntries(
  Object.entries(DERIVATION_RULES_BY_TYPE).map(([type, rules]) => [
    type,
    new Map(rules.map((rule) => [rule.toLowerCase(), rule])),
  ])
)

export function getDerivationRules(logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const type = getDerivationProblemType(logicSystem)
  return DERIVATION_RULES_BY_TYPE[type] ?? DERIVATION_RULES_BY_TYPE['derivation-hurley']
}

export function getDerivationRuleLookup(logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const type = getDerivationProblemType(logicSystem)
  return DERIVATION_RULE_LOOKUPS_BY_TYPE[type] ?? DERIVATION_RULE_LOOKUPS_BY_TYPE['derivation-hurley']
}
