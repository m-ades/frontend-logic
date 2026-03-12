export const hasNonEmptyAnswerIndices = (subq) => (
  Array.isArray(subq?.answerIndices) && subq.answerIndices.length > 0
)

export const isMultiSelectSubquestion = (subq) => (
  subq?.type === 'multi-select'
  || Boolean(subq?.multiSelect)
  || hasNonEmptyAnswerIndices(subq)
)

