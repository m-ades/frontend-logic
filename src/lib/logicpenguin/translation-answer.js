// describes the notation specific separators for one translation answer
// fitch uses commas and therefore while hurley keeps slash notation
export function getTranslationAnswerSyntax(notation) {
  return notation === 'calgary'
    ? { statementSeparator: ',', conclusionSeparator: '∴' }
    : { statementSeparator: '/', conclusionSeparator: '//' }
}

function splitTopLevel(value, separator) {
  const parts = []
  let start = 0
  let depth = 0
  const brackets = { '(': 1, '[': 1, '{': 1, ')': -1, ']': -1, '}': -1 }
  for (let index = 0; index < value.length; index += 1) {
    depth = Math.max(0, depth + (brackets[value[index]] ?? 0))
    if (depth === 0 && value.startsWith(separator, index)) {
      parts.push(value.slice(start, index).trim())
      index += separator.length - 1
      start = index + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts
}

// parses one answer into unordered statements and an optional final conclusion
// empty entries and repeated conclusion separators make the answer incomplete
export function parseTranslationAnswer(value, notation) {
  const syntax = getTranslationAnswerSyntax(notation)
  const source = notation === 'calgary'
    ? String(value ?? '').replaceAll(':.', '∴').trim()
    : String(value ?? '').trim()
  const conclusionParts = splitTopLevel(source, syntax.conclusionSeparator)
  const statements = splitTopLevel(
    conclusionParts[0] ?? '',
    syntax.statementSeparator
  )
  const hasConclusion = conclusionParts.length === 2
  const conclusion = hasConclusion ? conclusionParts[1] : null
  const validStructure = conclusionParts.length <= 2
  const complete = validStructure
    && statements.length > 0
    && statements.every(Boolean)
    && (!hasConclusion || Boolean(conclusion))
  return { statements, conclusion, hasConclusion, validStructure, complete }
}

// applies formula normalization while preserving the answer line structure
export function mapTranslationAnswer(value, notation, mapStatement) {
  const parsed = parseTranslationAnswer(value, notation)
  const syntax = getTranslationAnswerSyntax(notation)
  if (!parsed.validStructure) return String(value ?? '').trim()
  const statements = parsed.statements.map((statement) => mapStatement(statement))
  const premiseText = statements.join(`${syntax.statementSeparator} `)
  if (!parsed.hasConclusion) return premiseText
  return `${premiseText} ${syntax.conclusionSeparator} ${mapStatement(parsed.conclusion)}`
}

export function isCompleteTranslationAnswer(value, notation) {
  return parseTranslationAnswer(value, notation).complete
}
