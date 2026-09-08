import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { DEFAULT_LOGIC_SYSTEM, getNotation } from '../../../lib/logicSystems.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'
import {
  mapTranslationAnswer,
  parseTranslationAnswer,
} from '../../../lib/logicpenguin/translation-answer.js'

export function normalizeFormulaInput(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return getSyntax(getNotation(logicSystem)).inputfix(String(value ?? '')).trim()
}

export function displayFormulaInput(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const notation = getNotation(logicSystem)
  return displayIndexedSymbolsForNotation(
    getSyntax(notation).inputfix(String(value ?? '')),
    notation
  ).trim()
}

export function normalizeTranslationAnswerInput(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return mapTranslationAnswer(
    value,
    getNotation(logicSystem),
    (statement) => normalizeFormulaInput(statement, logicSystem)
  )
}

export function displayTranslationAnswerInput(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return mapTranslationAnswer(
    value,
    getNotation(logicSystem),
    (statement) => displayFormulaInput(statement, logicSystem)
  )
}

export function normalizeFormulaInputs(values, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return (Array.isArray(values) ? values : (values ? [values] : [])).map((value) => normalizeFormulaInput(value, logicSystem))
}

export function normalizeArgumentInput(argument, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const out = { ...(argument && typeof argument === 'object' ? argument : {}) }
  if (out.premises !== undefined) out.premises = normalizeFormulaInputs(out.premises, logicSystem)
  if (out.conclusion !== undefined) out.conclusion = normalizeFormulaInput(out.conclusion, logicSystem)
  return out
}

export function validateFormulaInput(value, logicSystem, label) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const Formula = getFormulaClass(getNotation(logicSystem))
  const formula = Formula.from(text)
  if (formula.wellformed) return ''
  return `${label}: ${formula.syntaxerrors || 'invalid formula'}`
}

export function validateFormulaInputs(values, logicSystem, label) {
  const list = Array.isArray(values) ? values : (values ? [values] : [])
  for (let i = 0; i < list.length; i += 1) {
    const error = validateFormulaInput(list[i], logicSystem, `${label} ${i + 1}`)
    if (error) return error
  }
  return ''
}

export function validateTranslationAnswerInput(value, logicSystem) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const parsed = parseTranslationAnswer(text, getNotation(logicSystem))
  if (!parsed.complete) return 'Correct answer contains an empty statement'
  const statements = parsed.hasConclusion
    ? [...parsed.statements, parsed.conclusion]
    : parsed.statements
  return validateFormulaInputs(statements, logicSystem, 'Correct answer statement')
}

export function validateArgumentInput(argument, logicSystem, label = 'Argument') {
  const premises = argument?.premises ?? argument?.prems
  const conclusion = argument?.conclusion ?? argument?.conc
  return validateFormulaInputs(premises, logicSystem, `${label} premise`)
    || validateFormulaInput(conclusion, logicSystem, `${label} conclusion`)
}

export function validateArgumentLineInput(value, logicSystem, label = 'Expected argument') {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const parts = text.split('//')
  if (parts.length !== 2) {
    return validateFormulaInput(text, logicSystem, label)
  }
  const premises = parts[0].split('/').map((part) => part.trim()).filter(Boolean)
  const conclusion = parts[1].trim()
  return validateFormulaInputs(premises, logicSystem, `${label} premise`)
    || validateFormulaInput(conclusion, logicSystem, `${label} conclusion`)
}
