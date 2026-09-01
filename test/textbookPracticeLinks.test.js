import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWorksheetTextbookContext } from '../src/components/textbook/textbookPracticeLinks.js'

const links = [
  {
    practiceId: 42,
    textbookSlug: 'Ch6',
    sectionId: 'Sx2',
  },
]

test('linked practice stays standalone without textbook navigation state', () => {
  assert.equal(resolveWorksheetTextbookContext(links, null), null)
  assert.equal(
    resolveWorksheetTextbookContext(links, { returnTo: '/student/practice' }),
    null,
  )
})

test('textbook navigation opens its linked chapter context', () => {
  assert.deepEqual(
    resolveWorksheetTextbookContext(links, {
      textbookSlug: 'Ch6',
      textbookSectionId: 'Sx3',
    }),
    {
      textbookSlug: 'Ch6',
      sectionId: 'Sx3',
    },
  )
})

test('stale or unrelated textbook navigation state stays standalone', () => {
  assert.equal(
    resolveWorksheetTextbookContext(links, { textbookSlug: 'Ch7' }),
    null,
  )
})
