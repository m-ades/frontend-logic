export const hasNonEmptyAnswerIndices = (subq) => (
  Array.isArray(subq?.answerIndices) && subq.answerIndices.length > 0
)

export const isMultiSelectSubquestion = (subq) => (
  subq?.type === 'multi-select'
  || Boolean(subq?.multiSelect)
  || hasNonEmptyAnswerIndices(subq)
)

const trueFalseChoices = Object.freeze(['True', 'False'])

/*
purpose preserves legacy true false subquestions inside multiple choice
contract supplies visible choices and the selected answer index
invariant true is index zero and false is index one
error behavior invalid answers have no selected index
*/
export function getSubquestionChoices(subq) {
  if (Array.isArray(subq?.choices) && subq.choices.length > 0) return subq.choices
  return subq?.type === 'true-false' ? trueFalseChoices : []
}

export function getSingleSelectAnswerIndex(subq) {
  const raw = subq?.answerIndex
    ?? (Array.isArray(subq?.answerIndices) ? subq.answerIndices[0] : undefined)
    ?? subq?.answer
  if (subq?.type === 'true-false') {
    if (raw === true || raw === 'true' || raw === 'T' || raw === 't') return 0
    if (raw === false || raw === 'false' || raw === 'F' || raw === 'f') return 1
  }
  const index = Number(raw)
  return Number.isFinite(index) ? index : null
}
