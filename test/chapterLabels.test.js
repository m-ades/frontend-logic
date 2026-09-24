import assert from 'node:assert/strict'
import test from 'node:test'
import { formatChapterLabel } from '../src/utils/chapterLabels.js'

test('homework numbers display as chapter numbers', () => {
  for (const value of ['HW3', 'hw3', ' HW 3 ']) {
    assert.equal(formatChapterLabel(value, 'Assignments'), 'Chapter 3')
  }
  assert.equal(formatChapterLabel('HW3.2', 'Practice'), 'Chapter 3.2')
})

test('numeric sections and custom labels retain their text', () => {
  for (const value of ['3', '3.2', 'Review', 'HW review']) {
    assert.equal(formatChapterLabel(value, 'Assignments'), `Chapter ${value}`)
  }
})

test('missing chapter labels use the page section title', () => {
  for (const value of [undefined, null, '', '  ']) {
    assert.equal(formatChapterLabel(value, 'Assignments'), 'Assignments')
    assert.equal(formatChapterLabel(value, 'Practice'), 'Practice')
  }
})
