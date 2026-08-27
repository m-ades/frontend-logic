import { parseTranslationAnswer } from './logicpenguin/translation-answer.js'

/**
 * parses one extraction argument written with commas and therefore
 * returns null unless every premise and the conclusion are present
 */
export function parseExtractionArgument(value) {
  const parsed = parseTranslationAnswer(value, 'calgary')
  if (!parsed.complete || !parsed.validStructure || !parsed.hasConclusion) return null
  return { premises: parsed.statements, conclusion: parsed.conclusion }
}
