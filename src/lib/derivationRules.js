import getHurleyRuleset from './logicpenguin/checkers/rules/hurley-rules.js'
import getForallxRuleset from './logicpenguin/checkers/rules/forallx-rules.js'
import getSyntax from './logicpenguin/symbolic/libsyntax.js'
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
  'AS',
  'DNE',
  'LEM',
  'CQ',
])

const RULE_NAME_ALIASES = new Map([
  ['dem', 'DeM'],
])
const RULE_SYMBOL_SYNTAX = getSyntax('calgary')

function normalizeRuleSymbolName(rule) {
  const raw = String(rule || '').trim()
  const match = raw.match(/^(.+)([iIeE])$/)
  if (!match) return raw
  let connective = match[1]
  if (/^v$/i.test(connective)) {
    connective = RULE_SYMBOL_SYNTAX.symbols.OR
  } else if (connective === '-' || connective === '–') {
    connective = RULE_SYMBOL_SYNTAX.symbols.NOT
  } else {
    connective = RULE_SYMBOL_SYNTAX.symbolfix(connective)
  }
  if (/^[A-Za-z]+$/.test(connective)) return raw
  return `${connective}${match[2].toUpperCase()}`
}

export function formatDerivationRuleName(rule) {
  const raw = normalizeRuleSymbolName(rule)
  const upper = raw.toUpperCase()
  if (FORCE_UPPER_DERIVATION_RULES.has(upper)) return upper
  const canonical = RULE_NAME_ALIASES.get(raw.toLowerCase())
  if (canonical) return canonical
  if (/[^A-Za-z]/.test(raw)) return raw
  const lower = raw.toLowerCase()
  return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : ''
}

function getRuleNames(ruleset, options = {}) {
  const includeHiddenAssumptions = Boolean(options.includeHiddenAssumptions)
  const hiddenAssumptionRule = ruleset.AS?.assumptionrule ? 'AS' : (ruleset.Hyp?.assumptionrule ? 'Hyp' : null)
  return Object.keys(ruleset)
    .filter((rule) => rule !== 'Pr' && rule !== 'PR' && rule !== 'Ass' && rule !== 'AS' && rule !== 'Hyp')
    .concat(includeHiddenAssumptions && hiddenAssumptionRule ? [hiddenAssumptionRule] : [])
    .filter((rule) => !ruleset[rule]?.hidden || (includeHiddenAssumptions && ruleset[rule]?.assumptionrule))
    .map((rule) => formatDerivationRuleName(rule))
}

const DERIVATION_RULES_BY_TYPE = {
  'derivation-hurley': getRuleNames(getHurleyRuleset()),
  'derivation-calgary': getRuleNames(getForallxRuleset('calgary', 'calgary'), {
    includeHiddenAssumptions: true,
  }),
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
