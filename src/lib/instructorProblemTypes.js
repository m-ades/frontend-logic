/*
purpose lists the question types instructors can create and edit
contract each entry has a persisted type and an instructor facing label
invariant every creatable type has a worksheet renderer and editor form
error behavior unknown types have no entry
*/

export const instructorProblemTypes = Object.freeze([
  { type: 'derivation', label: 'Derivation' },
  { type: 'truth-table', label: 'Truth table' },
  { type: 'partial-truth-table', label: 'Partial truth table' },
  { type: 'single-row-truth-table', label: 'Single-row truth table' },
  { type: 'indirect-truth-table', label: 'Indirect truth table' },
  { type: 'nonclassical-truth-table', label: 'Nonclassical truth table' },
  { type: 'symbolic-translation', label: 'Symbolic translation' },
  { type: 'multiple-choice', label: 'Multiple choice' },
  { type: 'evaluate-truth', label: 'Evaluate truth' },
  { type: 'combo-translation-truth-table', label: 'Translation and truth table' },
  { type: 'combo-translation-derivation', label: 'Translation and derivation' },
  { type: 'proof-argument-extraction', label: 'Proof argument extraction' },
])

const instructorProblemTypeSet = new Set(instructorProblemTypes.map(({ type }) => type))
const legacyInstructorProblemTypeSet = new Set([
  'derivation-hurley',
  'derivation-calgary',
])

export function isInstructorProblemType(type) {
  return instructorProblemTypeSet.has(type) || legacyInstructorProblemTypeSet.has(type)
}

const instructorProblemTypeLabels = new Map(
  instructorProblemTypes.map(({ type, label }) => [type, label])
)

export function getInstructorProblemTypeLabel(type) {
  if (legacyInstructorProblemTypeSet.has(type)) return 'Derivation'
  return instructorProblemTypeLabels.get(type) || type
}
