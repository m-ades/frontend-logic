import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { buildTextbookCatalog } from '../src/components/textbook/bookmlCatalog.js'
import { assignEntryKeys, slugifyTitle } from '../src/components/textbook/textbookKeys.js'
import {
  resetActiveTextbookCatalog,
  setActiveTextbookCatalog,
} from '../src/components/textbook/textbookCatalog.js'
import {
  assignTocLabels,
  mergeInventory,
  nodesToTree,
  normalizeStructureNode,
  seedStructureFromBundle,
} from '../src/components/textbook/textbookStructure.js'
import { normalizeLink } from '../src/components/textbook/textbookPracticeLinks.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const bundle = (file) => readFileSync(path.join(root, 'public/textbook-assets', file), 'utf8')

const catalogFrom = (indexHtml) =>
  buildTextbookCatalog({ indexHtml, imsManifestXml: '' })

const fullCatalog = () =>
  buildTextbookCatalog({
    indexHtml: bundle('index.html'),
    imsManifestXml: bundle('imsmanifest.xml'),
  })

/** Drop a chapter from the TOC the way a re-export after a LaTeX deletion would. */
function withoutChapter(indexHtml, slug) {
  const line = new RegExp(`<li[^>]*>\\s*<a href="${slug}\\.html"[\\s\\S]*?</li>`, 'i')
  const next = indexHtml.replace(line, '')
  assert.notEqual(next, indexHtml, `fixture did not drop ${slug}`)
  return next
}

/** BookML names files by position, so removing one shifts every later name. */
function renumberAfter(catalog, removedSlug) {
  const removedIndex = Number(removedSlug.replace(/^Ch/, ''))
  return {
    ...catalog,
    files: catalog.files.map((file) => {
      const match = /^Ch(\d+)$/.exec(file.slug)
      if (!match || Number(match[1]) < removedIndex) return file
      const shifted = `Ch${Number(match[1]) - 1}`
      return { ...file, slug: shifted, file: `${shifted}.html` }
    }),
  }
}

test('a key is stable, readable, and scoped by its part', () => {
  const entries = assignEntryKeys([
    { slug: 'Pt3', title: 'III Truth tables', kind: 'part', partSlug: 'Pt3' },
    { slug: 'Ch12', title: '12 Semantic concepts', kind: 'chapter', partSlug: 'Pt3' },
  ])

  assert.equal(entries[0].key, 'part/truth-tables')
  assert.equal(entries[1].key, 'chapter/truth-tables/semantic-concepts')
  assert.equal(slugifyTitle('12 Semantic concepts'), 'semantic-concepts')
})

test('every entry in the bundle gets a distinct key', () => {
  const catalog = fullCatalog()
  const keys = catalog.entries.map((entry) => entry.key)
  assert.equal(keys.filter(Boolean).length, catalog.entries.length)
  assert.equal(new Set(keys).size, catalog.entries.length)
  // The book repeats chapter titles across parts; the part scope separates them.
  assert.notEqual(
    catalog.entries.find((entry) => entry.slug === 'Ch7').key,
    catalog.entries.find((entry) => entry.slug === 'Ch29').key,
  )
})

test('a bundle can publish its own key and keep it', () => {
  const [entry] = assignEntryKeys([
    { slug: 'Ch12', title: '12 Renamed entirely', kind: 'chapter', key: 'phil279/semantics' },
  ])
  assert.equal(entry.key, 'phil279/semantics')
})

test('identical titles are separated in order rather than colliding', () => {
  const entries = assignEntryKeys([
    { slug: 'A7', title: '7 Ambiguity', kind: 'appendix', partSlug: null },
    { slug: 'A29', title: '29 Ambiguity', kind: 'appendix', partSlug: null },
  ])
  assert.equal(entries[0].key, 'appendix/ambiguity')
  assert.equal(entries[1].key, 'appendix/ambiguity-2')
})

test('removing a chapter in LaTeX does not shift course edits onto its neighbours', (t) => {
  t.after(resetActiveTextbookCatalog)

  const before = fullCatalog()
  setActiveTextbookCatalog(before)

  // The instructor hides chapter 13 and puts chapter 20 first.
  const stored = seedStructureFromBundle().map((node) => {
    if (node.slug === 'Ch13') return { ...node, hidden: true }
    if (node.slug === 'Ch20') return { ...node, parentId: null, sortIndex: -1 }
    return node
  })
  const hiddenKey = stored.find((node) => node.slug === 'Ch13').key
  const movedKey = stored.find((node) => node.slug === 'Ch20').key

  // Chapter 12 is deleted from the LaTeX; BookML renumbers everything after it.
  const after = renumberAfter(catalogFrom(withoutChapter(bundle('index.html'), 'Ch12')), 'Ch12')
  setActiveTextbookCatalog(after)

  const { nodes, missing, added } = mergeInventory(stored, after.files)
  const byKey = new Map(nodes.map((node) => [node.key, node]))

  assert.equal(added.length, 0)
  assert.deepEqual(missing.map((node) => node.slug), ['Ch12'])

  // The hidden chapter is still hidden, and now lives in the shifted file.
  assert.equal(byKey.get(hiddenKey).hidden, true)
  assert.equal(byKey.get(hiddenKey).slug, 'Ch12')
  assert.equal(byKey.get(hiddenKey).file, 'Ch12.html')

  // The reordered chapter kept its position too.
  assert.equal(byKey.get(movedKey).sortIndex, 0)

  // Nothing before the deletion moved.
  assert.equal(byKey.get('chapter/key-notions-of-logic/arguments').slug, 'Ch1')
})

test('practice links follow the chapter, not the filename', (t) => {
  t.after(resetActiveTextbookCatalog)

  const before = fullCatalog()
  setActiveTextbookCatalog(before)
  const link = normalizeLink({ id: 'l1', textbookSlug: 'Ch13', practiceId: 7 })
  assert.equal(link.textbookKey, 'chapter/truth-tables/limitations-of-tfl')

  const after = renumberAfter(catalogFrom(withoutChapter(bundle('index.html'), 'Ch12')), 'Ch12')
  setActiveTextbookCatalog({ ...after, entries: after.entries })

  // Re-reading the stored link resolves it through the key.
  const reread = normalizeLink(link)
  assert.equal(reread.textbookKey, link.textbookKey)
  assert.equal(reread.textbookSlug, 'Ch13')
})

test('rows written before keys existed are backfilled from the catalog', (t) => {
  t.after(resetActiveTextbookCatalog)
  setActiveTextbookCatalog(fullCatalog())

  const legacy = normalizeStructureNode({
    id: 'tn-legacy',
    slug: 'Ch12',
    file: 'Ch12.html',
    kind: 'chapter',
    displayTitle: 'Semantic concepts',
  })
  assert.equal(legacy.key, 'chapter/truth-tables/semantic-concepts')

  const legacyLink = normalizeLink({ id: 'l2', textbookSlug: 'Ch12' })
  assert.equal(legacyLink.textbookKey, 'chapter/truth-tables/semantic-concepts')
})

test('the table of contents shows the book’s own numbering, never a recomputed one', (t) => {
  t.after(resetActiveTextbookCatalog)
  setActiveTextbookCatalog(fullCatalog())

  // Move a late chapter to the front; its label must not become "1".
  const nodes = seedStructureFromBundle().map((node) =>
    node.slug === 'Ch20' ? { ...node, parentId: null, sortIndex: -1 } : node,
  )
  const labelled = assignTocLabels(nodesToTree(nodes, { includeHidden: false }))

  const find = (list, slug) => {
    for (const node of list) {
      if (node.slug === slug) return node
      const nested = find(node.children || [], slug)
      if (nested) return nested
    }
    return null
  }

  assert.equal(labelled[0].slug, 'Ch20')
  assert.equal(labelled[0].label, '20 Proof-theoretic concepts')
  assert.equal(find(labelled, 'Ch1').label, '1 Arguments')
  assert.equal(find(labelled, 'Pt1').label, 'I Key notions of logic')
})

test('a custom section keeps its own name and can still be deleted', (t) => {
  t.after(resetActiveTextbookCatalog)
  setActiveTextbookCatalog(fullCatalog())

  const section = normalizeStructureNode({
    id: 'tn-sec',
    key: 'section/abc123',
    slug: 'section-abc123',
    file: null,
    kind: 'part',
    displayTitle: 'Week 1 reading',
  })
  assert.equal(section.file, null)
  assert.equal(assignTocLabels([{ ...section, children: [] }])[0].label, 'Week 1 reading')

  // Reconciling never drops an instructor's own section.
  const { nodes } = mergeInventory([section], fullCatalog().files)
  assert.ok(nodes.some((node) => node.key === 'section/abc123'))
})
