import test from 'node:test'
import assert from 'node:assert/strict'
import { mapQuestionToProof } from '../src/lib/mapQuestionToProof.js'

test('preserves multi select mode when the student snapshot has no answer key', () => {
  const proof = mapQuestionToProof({
    id: 12,
    question_snapshot: {
      type: 'multiple-choice',
      prompt: 'select every valid option',
      choices: ['first', 'second', 'third'],
      multiSelect: true,
    },
  }, { id: 4 }, 0)

  assert.equal(proof.multipleChoice.multiSelect, true)
  assert.equal(proof.answer, undefined)
})

test('keeps single answer questions in single select mode', () => {
  const proof = mapQuestionToProof({
    id: 13,
    question_snapshot: {
      type: 'multiple-choice',
      prompt: 'select one option',
      choices: ['first', 'second'],
      answerIndex: 1,
    },
  }, { id: 4 }, 0)

  assert.equal(proof.multipleChoice.multiSelect, false)
  assert.equal(proof.answer, 1)
})
