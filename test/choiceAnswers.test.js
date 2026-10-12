import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findQuestionWithoutAnswer,
  hasAnswerKey,
  removeChoiceFromAnswers,
} from '../src/components/problems/instructor-question-editor/choiceAnswers.js'

test('removing a choice keeps the other answers on the same choice text', () => {
  assert.deepEqual(removeChoiceFromAnswers([1, 2, 3, 5, 6], 4), [1, 2, 3, 4, 5])
  assert.deepEqual(removeChoiceFromAnswers([1, 6], 6), [1])
  assert.deepEqual(removeChoiceFromAnswers([2], 2), [])
  assert.deepEqual(removeChoiceFromAnswers([null, 3], 0), [null, 2])
})

test('a question needs a correct answer of the kind it asks for', () => {
  assert.equal(hasAnswerKey({ answerIndex: 0 }), true)
  assert.equal(hasAnswerKey({ answerIndex: null }), false)
  assert.equal(hasAnswerKey({ multiSelect: true, answerIndices: [] }), false)
  assert.equal(hasAnswerKey({ multiSelect: true, answerIndices: [1] }), true)
  assert.equal(findQuestionWithoutAnswer([{ answerIndex: 1 }, { answerIndex: null }]), 1)
  assert.equal(findQuestionWithoutAnswer(undefined), -1)
})
