// owns classification copy completeness and equality rules
// functions are pure and do not depend on rendering storage or submission

export function getTruthTableClassification(kind, statementCount = 0) {
  if (kind === 'formula') {
    return {
      selectionMode: 'single',
      prompt: 'Use this truth table to classify the following sentence.',
      options: [
        { value: 'tautology', label: 'A tautology' },
        { value: 'self-contradiction', label: 'A contradiction' },
        { value: 'contingent', label: 'Contingent (neither a tautology nor a contradiction)' },
      ],
    }
  }
  if (kind === 'argument') {
    return {
      selectionMode: 'single',
      prompt: 'Use this truth table to determine whether the argument is valid or invalid.',
      options: [
        { value: 'valid', label: 'Valid' },
        { value: 'invalid', label: 'Invalid' },
      ],
    }
  }
  if (kind === 'equivalence') {
    const isTwoSentenceProblem = statementCount === 2
    return {
      selectionMode: isTwoSentenceProblem ? 'multiple' : 'single',
      prompt: isTwoSentenceProblem
        ? 'Use this truth table to determine which of the following relationships hold between the two sentences below. Select all that apply.'
        : 'Use this truth table to determine whether the following set of sentences is jointly satisfiable or jointly unsatisfiable.',
      options: [
        { value: 'consistent', label: 'Jointly satisfiable' },
        { value: 'inconsistent', label: 'Jointly unsatisfiable' },
        ...(isTwoSentenceProblem
          ? [{ value: 'equivalent', label: 'Equivalent' }]
          : []),
      ],
    }
  }
  return { selectionMode: 'multiple', prompt: 'Select all that apply', options: [] }
}

export function isTruthTableClassificationComplete(kind, selection = []) {
  const values = new Set(selection)
  if (kind === 'formula') {
    return ['tautology', 'self-contradiction', 'contingent'].filter((value) => values.has(value)).length === 1
  }
  if (kind === 'argument') {
    return ['valid', 'invalid'].filter((value) => values.has(value)).length === 1
  }
  if (kind === 'equivalence') {
    return ['consistent', 'inconsistent'].filter((value) => values.has(value)).length === 1
  }
  return selection.length > 0
}

export function truthTableClassificationsMatch(selection = [], expected = []) {
  const selectedValues = new Set(selection)
  const expectedValues = new Set(expected)
  if (selectedValues.size !== expectedValues.size) return false
  return [...selectedValues].every((value) => expectedValues.has(value))
}
