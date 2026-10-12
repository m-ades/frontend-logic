import {
  getSingleSelectAnswerIndex,
  hasNonEmptyAnswerIndices,
  isMultiSelectSubquestion,
} from '@logic-app/logic-engine/multiple-choice-utils.js'

// drops answers on a removed choice and shifts later ones down so they keep pointing at the same text
export function removeChoiceFromAnswers(answers, removedIndex) {
  return answers
    .filter((answer) => answer !== removedIndex)
    .map((answer) => (Number.isInteger(answer) && answer > removedIndex ? answer - 1 : answer))
}

export function hasAnswerKey(question) {
  return isMultiSelectSubquestion(question)
    ? hasNonEmptyAnswerIndices(question)
    : getSingleSelectAnswerIndex(question) !== null
}

// index of the first question with no correct answer, or -1
export function findQuestionWithoutAnswer(questions) {
  return (Array.isArray(questions) ? questions : []).findIndex((question) => !hasAnswerKey(question))
}
