import {
  parseArgumentLine,
  resolveExpectedArgument,
} from '@logic-app/logic-engine/argumentLine.js'

export function unwrapAnswer(source) {
  return source?.answer ? unwrapAnswer(source.answer) : source
}

// reads a stored answer or typed line as a complete argument or null
export function getExpectedArgument(source) {
  const answer = unwrapAnswer(source)
  if (!answer) return null
  const expected = typeof answer === 'string'
    ? parseArgumentLine(answer)
    : resolveExpectedArgument(answer)
  return !expected.error && expected.premises.length > 0 && expected.conclusion ? expected : null
}

export function formatArgumentLine({ premises, conclusion }) {
  return `${premises.join(' / ')} // ${conclusion}`
}
