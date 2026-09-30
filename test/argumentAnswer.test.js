import test from 'node:test'
import assert from 'node:assert/strict'
import getFormulaClass from '@logic-app/logic-engine/symbolic/formula.js'
import {
  formatArgumentLine,
  getExpectedArgument,
  isWellformedArgument,
} from '../src/components/problems/mui/translation/argumentAnswer.js'

const expected = { premises: ['P', 'Q'], conclusion: 'R' }

test('reads typed lines and nested stored answers', () => {
  assert.deepEqual(getExpectedArgument('P / Q // R'), expected)
  assert.deepEqual(getExpectedArgument({ answer: { answer: { argument: 'P / Q // R' } } }), expected)
  assert.deepEqual(getExpectedArgument({ translations: ['P', 'R', 'Q'], index: 1 }), expected)
})

test('rejects incomplete arguments', () => {
  assert.equal(getExpectedArgument('P / Q'), null)
  assert.equal(getExpectedArgument({ translations: [''], index: 0 }), null)
  assert.equal(getExpectedArgument(null), null)
})

test('formats an argument as a single line', () => {
  assert.equal(formatArgumentLine(expected), 'P / Q // R')
})

test('flags an argument with a malformed formula', () => {
  const Formula = getFormulaClass('hurley')
  assert.equal(isWellformedArgument({ premises: ['P > Q', 'P'], conclusion: 'Q' }, Formula), true)
  assert.equal(isWellformedArgument({ premises: ['P >', 'P'], conclusion: 'Q' }, Formula), false)
  assert.equal(isWellformedArgument({ premises: ['P'], conclusion: 'Q (' }, Formula), false)
})
