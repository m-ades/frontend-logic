import { DEFAULT_LOGIC_SYSTEM } from '../../../lib/logicSystems.js'
import {
  FORCE_UPPER_DERIVATION_RULES,
  formatDerivationRuleName,
  getDerivationRuleLookup,
  getDerivationRules,
} from '../../../lib/derivationRules.js'

export function normalizeRuleToken(token, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const raw = String(token || '').trim()
  if (!raw) return ''
  const ruleLookup = getDerivationRuleLookup(logicSystem)
  const fromLookup = ruleLookup.get(raw.toLowerCase())
  if (fromLookup) return fromLookup
  const formatted = formatDerivationRuleName(raw)
  const fromFormatted = ruleLookup.get(formatted.toLowerCase())
  if (fromFormatted) return fromFormatted
  const upper = raw.toUpperCase()
  if (FORCE_UPPER_DERIVATION_RULES.has(upper)) return upper
  return formatted
}

export function parseRuleList(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = Array.isArray(value)
    ? value.flatMap((entry) => String(entry || '').split(/[,\s]+/g))
    : String(value || '').split(/[,\s]+/g)
  const out = []
  const seen = new Set()
  source.forEach((entry) => {
    const normalized = normalizeRuleToken(entry, logicSystem)
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(normalized)
  })
  return out
}

export function isKnownDerivationRule(rule, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const raw = String(rule || '').trim()
  if (!raw) return true
  const ruleLookup = getDerivationRuleLookup(logicSystem)
  const formatted = formatDerivationRuleName(raw)
  return Boolean(ruleLookup.get(raw.toLowerCase()) || ruleLookup.get(formatted.toLowerCase()))
}

export function invalidRuleTokens(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = Array.isArray(value)
    ? value.flatMap((entry) => String(entry || '').split(/[,\s]+/g))
    : String(value || '').split(/[,\s]+/g)
  const seen = new Set()
  const out = []
  source.forEach((entry) => {
    const token = String(entry || '').trim()
    if (!token || isKnownDerivationRule(token, logicSystem)) return
    const key = token.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(token)
  })
  return out
}

export function normalizeRuleListText(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return String(value ?? '')
    .split(/([,\s]+)/g)
    .map((part) => part.trim() ? normalizeRuleToken(part, logicSystem) : part)
    .join('')
}

export function getRuleValue(source, keys) {
  const obj = source && typeof source === 'object' ? source : {}
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key]
  }
  return undefined
}

export function removeRuleKeys(source, keys) {
  const out = { ...(source && typeof source === 'object' ? source : {}) }
  keys.forEach((key) => {
    delete out[key]
  })
  return out
}

export const ALLOW_RULE_KEYS = ['allow', 'allowed']
export const DISALLOW_RULE_KEYS = ['disallow', 'disallowed', 'deny', 'forbid', 'forbidden']
export const RULE_AVAILABILITY_MODES = new Set(['all', 'only', 'except'])

export function getRuleAvailabilityMode(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  if (RULE_AVAILABILITY_MODES.has(ruleset?.availabilityMode)) return ruleset.availabilityMode
  if (parseRuleList(getRuleValue(ruleset, ALLOW_RULE_KEYS), logicSystem).length) return 'only'
  if (parseRuleList(getRuleValue(ruleset, DISALLOW_RULE_KEYS), logicSystem).length) return 'except'
  return 'all'
}

export function getAvailableDerivationRules(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const allRules = getDerivationRules(logicSystem)
  const allow = parseRuleList(getRuleValue(ruleset, ALLOW_RULE_KEYS), logicSystem)
  const disallow = parseRuleList(getRuleValue(ruleset, DISALLOW_RULE_KEYS), logicSystem)
  const disallowSet = new Set(disallow.map((rule) => rule.toLowerCase()))
  const source = allow.length ? allow : allRules
  return source.filter((rule) => !disallowSet.has(rule.toLowerCase()))
}

export function normalizeDerivationRuleset(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = ruleset && typeof ruleset === 'object' ? ruleset : {}
  const mode = getRuleAvailabilityMode(source, logicSystem)
  const allowFromInput = mode === 'only'
    ? parseRuleList(getRuleValue(source, ALLOW_RULE_KEYS), logicSystem)
    : []
  const disallow = mode === 'except'
    ? parseRuleList(getRuleValue(source, DISALLOW_RULE_KEYS), logicSystem)
    : []
  const require = parseRuleList(source.require ?? source.required ?? source.necessary, logicSystem)
  const requireAny = parseRuleList(source.requireAny ?? source.requiredAny, logicSystem)
  const disallowSet = new Set(parseRuleList(getRuleValue(source, DISALLOW_RULE_KEYS), logicSystem).map((rule) => rule.toLowerCase()))
  const allow = mode === 'only'
    ? allowFromInput.filter((rule) => !disallowSet.has(rule.toLowerCase()))
    : []

  const normalized = {}
  if (allow.length) normalized.allow = allow
  if (disallow.length) normalized.disallow = disallow
  if (require.length) normalized.require = require
  if (requireAny.length) normalized.requireAny = requireAny
  return Object.keys(normalized).length ? normalized : null
}

export function validateDerivationRuleset(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = ruleset && typeof ruleset === 'object' ? ruleset : {}
  const mode = getRuleAvailabilityMode(source, logicSystem)
  const allowRaw = getRuleValue(source, ALLOW_RULE_KEYS)
  const disallowRaw = getRuleValue(source, DISALLOW_RULE_KEYS)
  const requireRaw = source.require ?? source.required ?? source.necessary
  const requireAnyRaw = source.requireAny ?? source.requiredAny
  const invalid = [
    ...invalidRuleTokens(allowRaw, logicSystem),
    ...invalidRuleTokens(disallowRaw, logicSystem),
    ...invalidRuleTokens(requireRaw, logicSystem),
    ...invalidRuleTokens(requireAnyRaw, logicSystem),
  ]
  if (invalid.length) return `Rule does not exist in this logic system: ${invalid[0]}`
  if (mode === 'only' && !parseRuleList(allowRaw, logicSystem).length) {
    return 'Choose at least one available rule, or set rule availability to all rules.'
  }
  if (mode === 'except' && !parseRuleList(disallowRaw, logicSystem).length) {
    return 'Choose at least one rule to exclude, or set rule availability to all rules.'
  }

  const availableSet = new Set(getAvailableDerivationRules(source, logicSystem).map((rule) => rule.toLowerCase()))
  const required = [
    ...parseRuleList(requireRaw, logicSystem),
    ...parseRuleList(requireAnyRaw, logicSystem),
  ]
  const unavailableRequired = required.find((rule) => !availableSet.has(rule.toLowerCase()))
  if (unavailableRequired) return `Required rule is not available to students: ${unavailableRequired}`
  return ''
}
