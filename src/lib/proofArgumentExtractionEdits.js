// rebases supplied citations after one absolute proof line is inserted or removed
// insertions shift references at and after the changed line
// removals clear citations covering the removed line and shift later references
// invalid changes leave a normalized copy unchanged
import { justParse } from '../components/ui/logicpenguin/justification-parse.js'

function formatJustification({ nums, ranges, citedrules }, rulesFirst) {
  const references = [
    ...nums.map(String),
    ...ranges.map(([start, end]) => `${start}–${end}`),
  ].join(', ')
  const rules = citedrules.join(', ')
  return rulesFirst
    ? [rules, references].filter(Boolean).join(' ')
    : [references, rules].filter(Boolean).join(' ')
}

function rangeContainsLine([start, end], lineNumber) {
  if (start === lineNumber || end === lineNumber) return true
  return Number.isInteger(start)
    && Number.isInteger(end)
    && start < lineNumber
    && lineNumber < end
}

function shiftReference(reference, lineNumber, operation) {
  if (!Number.isInteger(reference)) return reference
  if (operation === 'insert') {
    return reference >= lineNumber ? reference + 1 : reference
  }
  return reference > lineNumber ? reference - 1 : reference
}

export function rebaseProofJustifications(
  justifications,
  { lineNumber, operation, rulesFirst = false } = {}
) {
  const normalized = (Array.isArray(justifications) ? justifications : [])
    .map((value) => String(value ?? '').trim())
  if (!Number.isInteger(lineNumber) || lineNumber < 1
    || (operation !== 'insert' && operation !== 'remove')) {
    return normalized
  }

  return normalized.map((value) => {
    if (!value) return ''
    const parsed = justParse(value)
    if (operation === 'remove' && (
      parsed.nums.includes(lineNumber)
      || parsed.ranges.some((range) => rangeContainsLine(range, lineNumber))
    )) {
      return ''
    }
    if (parsed.nums.length === 0 && parsed.ranges.length === 0) return value
    return formatJustification({
      nums: parsed.nums.map((reference) => shiftReference(reference, lineNumber, operation)),
      ranges: parsed.ranges.map(([start, end]) => [
        shiftReference(start, lineNumber, operation),
        shiftReference(end, lineNumber, operation),
      ]),
      citedrules: parsed.citedrules,
    }, rulesFirst)
  })
}
