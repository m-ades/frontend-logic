import { getDerivationRulesForLogicSystem } from '@logic-app/logic-engine/checkers/derivation-by-logic-system.js'
import getSyntax, { normalizeRuleSymbolName } from '@logic-app/logic-engine/symbolic/libsyntax.js'
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

export function formatDerivationRuleName(rule) {
  const raw = normalizeRuleSymbolName(rule, RULE_SYMBOL_SYNTAX)
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
  'derivation-hurley': getRuleNames(getDerivationRulesForLogicSystem('hurley')),
  'derivation-calgary': getRuleNames(getDerivationRulesForLogicSystem('fitch'), {
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

// the phone rules keypad lays a proof's allowed rules out in the families each textbook teaches them in
const DERIVATION_RULE_GROUPS = {
  'derivation-calgary': [
    { key: 'introduction', label: 'Introduction rules', rules: ['∧I', '∨I', '→I', '↔I', '¬I', '∀I', '∃I', '=I'] },
    { key: 'elimination', label: 'Elimination rules', rules: ['∧E', '∨E', '→E', '↔E', '¬E', '∀E', '∃E', '=E'] },
    { key: 'basic', label: 'Assumption and basic rules', rules: ['AS', 'R', 'X', 'IP'] },
    { key: 'derived', label: 'Derived rules', rules: ['DS', 'MT', 'DNE', 'LEM', 'DeM', 'CQ'] },
  ],
  'derivation-hurley': [
    { key: 'implication', label: 'Rules of implication', rules: ['MP', 'MT', 'HS', 'DS', 'CD', 'Simp', 'Conj', 'Add'] },
    { key: 'replacement', label: 'Rules of replacement', rules: ['DM', 'Com', 'Assoc', 'Dist', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut'] },
    { key: 'proof', label: 'Conditional and indirect proof', rules: ['ACP', 'CP', 'AIP', 'IP'] },
    { key: 'predicate', label: 'Quantifier and identity rules', rules: ['UI', 'UG', 'EI', 'EG', 'QN', '=I', '=O'] },
  ],
}

// rule names compare without case or the text style selector the symbol buttons' arrows carry
const ruleKey = (rule) => String(rule ?? '').replace(/[︎️]/g, '').toLowerCase()

export function isSameDerivationRule(a, b) {
  return Boolean(a) && ruleKey(a) === ruleKey(b)
}

/*
groups rules for the phone rules keypad, in textbook order within each group
only the given rules appear, as given, empty groups are dropped, and any rule no group names goes in other at the end
*/
export function groupDerivationRules(rules, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const given = [...new Set((Array.isArray(rules) ? rules : []).filter(Boolean))]
  const byKey = new Map(given.map((rule) => [ruleKey(rule), rule]))
  const placed = new Set()
  const groups = []
  for (const { key, label, rules: names } of DERIVATION_RULE_GROUPS[getDerivationProblemType(logicSystem)] ?? []) {
    const present = names
      .map((name) => byKey.get(ruleKey(name)))
      .filter((rule) => rule && !placed.has(rule))
    present.forEach((rule) => placed.add(rule))
    if (present.length) groups.push({ key, label, rules: present })
  }
  const other = given.filter((rule) => !placed.has(rule))
  if (other.length) groups.push({ key: 'other', label: 'Other rules', rules: other })
  return groups
}
