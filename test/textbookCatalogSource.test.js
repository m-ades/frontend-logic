import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  buildTextbookCatalog,
  inferKindFromSlug,
  isUsableTextbookCatalog,
  parseBookmlStylesheets,
  parseBookmlToc,
  loadRemoteTextbookCatalog,
  parseImsManifest,
} from '../src/components/textbook/bookmlCatalog.js'
import {
  isAllowedTextbookOrigin,
  normalizeTextbookBaseUrl,
  resolveTextbookSource,
  textbookFileUrl,
} from '../src/components/textbook/textbookSource.js'
import { rewriteAssetSrc, rewriteHref } from '../src/components/textbook/prepareTextbookHtml.js'
import {
  getTextbookAssetBase,
  getTextbookNeighbors,
  listTextbookNavItems,
  resetActiveTextbookCatalog,
  resolveTextbookAssetUrl,
  setActiveTextbookCatalog,
} from '../src/components/textbook/textbookCatalog.js'
import { getTextbookInventory } from '../src/components/textbook/textbookStructure.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const bundle = (file) => readFileSync(path.join(root, 'public/textbook-assets', file), 'utf8')
const shippedManifest = JSON.parse(
  readFileSync(path.join(root, 'src/components/textbook/textbookManifest.json'), 'utf8'),
)

const REMOTE = 'https://example-prof.github.io/forallx-yyc'

test('only https bundles on allowlisted hosts are accepted', () => {
  assert.equal(isAllowedTextbookOrigin('https://prof.github.io/book'), true)
  assert.equal(isAllowedTextbookOrigin('https://cdn.jsdelivr.net/gh/prof/book@v1'), true)

  for (const rejected of [
    'http://prof.github.io/book',
    'https://github.io.attacker.test/book',
    'https://raw.githubusercontent.com/prof/book/main',
    'javascript:alert(1)',
    'not a url',
    '',
    null,
  ]) {
    assert.equal(isAllowedTextbookOrigin(rejected), false, String(rejected))
    assert.equal(normalizeTextbookBaseUrl(rejected), null, String(rejected))
  }
})

test('a bundle base names a directory and nothing else', () => {
  assert.equal(normalizeTextbookBaseUrl('https://prof.github.io/book/'), 'https://prof.github.io/book')
  assert.equal(
    normalizeTextbookBaseUrl('https://prof.github.io/book?ref=x#top'),
    'https://prof.github.io/book',
  )
  assert.equal(textbookFileUrl(REMOTE, './Ch1.html'), `${REMOTE}/Ch1.html`)
  assert.equal(textbookFileUrl(`${REMOTE}/`, 'bmlimages/a.svg'), `${REMOTE}/bmlimages/a.svg`)
})

test('the bundled copy is used when no remote source is configured', () => {
  assert.deepEqual(resolveTextbookSource(), {
    kind: 'local',
    baseUrl: '/textbook-assets',
    isRemote: false,
  })
  assert.equal(resolveTextbookSource('https://prof.github.io/book/').isRemote, true)
  // A rejected override must not silently become a remote source.
  assert.equal(resolveTextbookSource('https://attacker.test/book').kind, 'local')
})

test('the catalog derived from the bundle matches the manifest this repo ships', () => {
  const catalog = buildTextbookCatalog({
    indexHtml: bundle('index.html'),
    imsManifestXml: bundle('imsmanifest.xml'),
  })

  assert.equal(catalog.bookTitle, shippedManifest.bookTitle)
  assert.equal(catalog.defaultSlug, shippedManifest.defaultSlug)
  assert.equal(catalog.entries.length, shippedManifest.entries.length)

  for (const [index, entry] of catalog.entries.entries()) {
    const expected = shippedManifest.entries[index]
    for (const field of ['slug', 'file', 'title', 'kind', 'partSlug', 'prev', 'next']) {
      assert.equal(entry[field], expected[field], `${expected.slug}.${field}`)
    }
  }

  // Every navigable entry is reachable from the cover by following `next`.
  const bySlug = new Map(catalog.entries.map((entry) => [entry.slug, entry]))
  let cursor = catalog.entries[0]
  let visited = 0
  while (cursor) {
    visited += 1
    cursor = cursor.next ? bySlug.get(cursor.next) : null
  }
  assert.equal(visited, catalog.entries.length)
})

test('parts keep their chapters and back matter keeps its appendices', () => {
  const entries = parseBookmlToc(bundle('index.html'))
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]))

  assert.equal(bySlug.get('Chx1').partSlug, null)
  assert.equal(bySlug.get('Pt1').kind, 'part')
  assert.equal(bySlug.get('Pt1').partSlug, 'Pt1')
  assert.equal(bySlug.get('Ch1').partSlug, 'Pt1')
  assert.equal(bySlug.get('Ptx1').kind, 'backmatter')
  assert.equal(bySlug.get('A1').kind, 'appendix')
  assert.equal(bySlug.get('A1').partSlug, 'Ptx1')
  assert.equal(bySlug.get('A1a').partSlug, 'Ptx2')
})

test('gitbook chrome never reaches the app shell', () => {
  const stylesheets = parseBookmlStylesheets(bundle('index.html'))
  assert.ok(stylesheets.length > 0)
  assert.deepEqual(stylesheets.filter((href) => href.startsWith('bookml/')), [])
  assert.deepEqual(
    [...stylesheets].sort(),
    shippedManifest.stylesheets.map((href) => href.replace('/textbook-assets/', '')).sort(),
  )
})

test('the SCORM manifest supplies the book title, version and file list', () => {
  const ims = parseImsManifest(bundle('imsmanifest.xml'))
  assert.equal(ims.bookTitle, 'forall x: Calgary')
  assert.match(ims.version, /^Fall 2025 /)
  assert.ok(ims.files.includes('Ch1.html'))
  assert.ok(ims.files.includes('bmlimages/forallxyyc-html-1.svg'))
})

test('file names carry the structural role', () => {
  assert.equal(inferKindFromSlug('index'), 'cover')
  assert.equal(inferKindFromSlug('Chx1'), 'preface')
  assert.equal(inferKindFromSlug('Ptx1'), 'backmatter')
  assert.equal(inferKindFromSlug('Pt3'), 'part')
  assert.equal(inferKindFromSlug('Ch12'), 'chapter')
  assert.equal(inferKindFromSlug('A1a'), 'appendix')
  assert.equal(inferKindFromSlug('whatever'), null)
})

test('a half published bundle cannot replace a working catalog', () => {
  assert.equal(isUsableTextbookCatalog(null), false)
  assert.equal(isUsableTextbookCatalog({ assetBase: REMOTE, entries: [] }), false)
  assert.equal(isUsableTextbookCatalog({ entries: [{ slug: 'Ch1' }] }), false)
  assert.equal(isUsableTextbookCatalog({ assetBase: REMOTE, entries: [{ slug: '' }] }), false)
  assert.equal(isUsableTextbookCatalog({ assetBase: REMOTE, entries: [{ slug: 'Ch1' }] }), true)
})

test('a remote bundle resolves its own assets while chapters stay app routes', () => {
  assert.equal(rewriteAssetSrc('bmlimages/a.svg', REMOTE), `${REMOTE}/bmlimages/a.svg`)
  assert.equal(rewriteAssetSrc('./forallxyyc.pdf', REMOTE), `${REMOTE}/forallxyyc.pdf`)
  assert.equal(rewriteHref('forallxyyc.pdf', '/textbook', REMOTE), `${REMOTE}/forallxyyc.pdf`)
  assert.equal(rewriteHref('Ch7.html#Sx1', '/textbook', REMOTE), '/textbook/Ch7#Sx1')
  // Absolute and same-origin references are left alone either way.
  assert.equal(rewriteAssetSrc('/textbook-assets/a.svg', REMOTE), '/textbook-assets/a.svg')
  assert.equal(rewriteAssetSrc('https://cdn.test/a.svg', REMOTE), 'https://cdn.test/a.svg')
  // Without a base the bundled path is still the default.
  assert.equal(rewriteAssetSrc('bmlimages/a.svg'), '/textbook-assets/bmlimages/a.svg')
})

test('installing a remote catalog moves every lookup to that bundle', (t) => {
  t.after(resetActiveTextbookCatalog)

  // Before the swap: the manifest this repo ships, served from public/.
  assert.equal(getTextbookAssetBase(), '/textbook-assets')
  assert.equal(resolveTextbookAssetUrl('Ch1'), '/textbook-assets/Ch1.html')

  const catalog = buildTextbookCatalog({
    indexHtml: bundle('index.html'),
    imsManifestXml: bundle('imsmanifest.xml'),
    assetBase: REMOTE,
  })
  assert.equal(setActiveTextbookCatalog(catalog), true)

  assert.equal(getTextbookAssetBase(), REMOTE)
  assert.equal(resolveTextbookAssetUrl('Ch1'), `${REMOTE}/Ch1.html`)
  assert.equal(resolveTextbookAssetUrl('index'), `${REMOTE}/index.html`)
  // Aliases and case-insensitive slugs keep working against the new catalog.
  assert.equal(resolveTextbookAssetUrl('chapter-1'), `${REMOTE}/Ch1.html`)
  assert.equal(resolveTextbookAssetUrl('ch1'), `${REMOTE}/Ch1.html`)
  assert.equal(resolveTextbookAssetUrl('does-not-exist'), null)

  // The cover leads into whatever the new bundle lists first.
  assert.equal(listTextbookNavItems()[0].next, catalog.entries[0].slug)
  assert.equal(getTextbookNeighbors('Ch1').next.slug, 'Ch2')

  // Instructors reconcile course structure against the remote file list.
  const inventory = getTextbookInventory()
  assert.equal(inventory.assetBase, REMOTE)
  assert.equal(inventory.files.length, catalog.files.length)
})

test('a catalog that cannot drive the reader is refused', (t) => {
  t.after(resetActiveTextbookCatalog)
  assert.equal(setActiveTextbookCatalog({ assetBase: REMOTE, entries: [] }), false)
  assert.equal(getTextbookAssetBase(), '/textbook-assets')
})

/** Serves the repo's own bundle over a stub fetch, as a published site would. */
function bundleServer({ extraFiles = {}, missing = [] } = {}) {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    const file = url.slice(`${REMOTE}/`.length)
    if (missing.includes(file)) return { ok: false, status: 404 }
    if (file in extraFiles) {
      return { ok: true, status: 200, text: async () => extraFiles[file] }
    }
    try {
      return { ok: true, status: 200, text: async () => bundle(file) }
    } catch {
      return { ok: false, status: 404 }
    }
  }
  return { fetchImpl, calls }
}

test('a verbatim BookML bundle needs nothing added to it', async () => {
  const { fetchImpl, calls } = bundleServer()
  const catalog = await loadRemoteTextbookCatalog(REMOTE, { fetchImpl })

  assert.equal(catalog.source, 'derived')
  assert.equal(catalog.assetBase, REMOTE)
  assert.equal(catalog.bookTitle, 'forall x: Calgary')
  assert.equal(catalog.entries.length, shippedManifest.entries.length)
  assert.equal(catalog.stylesheets[0], `${REMOTE}/LaTeXML.css`)
  // The optional catalog is tried first, then the two files BookML always emits.
  assert.deepEqual(calls, [
    `${REMOTE}/hula-textbook.json`,
    `${REMOTE}/index.html`,
    `${REMOTE}/imsmanifest.xml`,
  ])
})

test('a published catalog is preferred and never redirects the asset base', async () => {
  const published = JSON.stringify({
    bookTitle: 'forall x: Calgary (PHIL 279)',
    defaultSlug: 'Ch2',
    assetBase: 'https://attacker.test/book',
    entries: [{ slug: 'Ch2', file: 'Ch2.html', title: 'The scope of logic', kind: 'chapter' }],
    files: [{ slug: 'Ch2', file: 'Ch2.html', kind: 'chapter', displayTitle: 'The scope of logic' }],
  })
  const { fetchImpl, calls } = bundleServer({ extraFiles: { 'hula-textbook.json': published } })
  const catalog = await loadRemoteTextbookCatalog(REMOTE, { fetchImpl })

  assert.equal(catalog.source, 'published')
  assert.equal(catalog.bookTitle, 'forall x: Calgary (PHIL 279)')
  assert.equal(catalog.assetBase, REMOTE)
  assert.deepEqual(calls, [`${REMOTE}/hula-textbook.json`])
})

test('a malformed published catalog falls back to deriving one', async () => {
  for (const broken of ['{ not json', JSON.stringify({ entries: [] })]) {
    const { fetchImpl } = bundleServer({ extraFiles: { 'hula-textbook.json': broken } })
    const catalog = await loadRemoteTextbookCatalog(REMOTE, { fetchImpl })
    assert.equal(catalog.source, 'derived')
    assert.equal(catalog.entries.length, shippedManifest.entries.length)
  }
})

test('a bundle with no table of contents is rejected rather than half loaded', async () => {
  const { fetchImpl } = bundleServer({ extraFiles: { 'index.html': '<html><body>WIP</body></html>' } })
  await assert.rejects(
    () => loadRemoteTextbookCatalog(REMOTE, { fetchImpl }),
    /No readable table of contents/,
  )

  const unreachable = bundleServer({ missing: ['hula-textbook.json', 'index.html'] })
  await assert.rejects(() => loadRemoteTextbookCatalog(REMOTE, { fetchImpl: unreachable.fetchImpl }))
})

test('a missing SCORM manifest still yields a usable book', async () => {
  const { fetchImpl } = bundleServer({ missing: ['hula-textbook.json', 'imsmanifest.xml'] })
  const catalog = await loadRemoteTextbookCatalog(REMOTE, { fetchImpl })

  assert.equal(catalog.entries.length, shippedManifest.entries.length)
  assert.equal(catalog.defaultSlug, 'Ch1')
  // Without imsmanifest.xml the file list comes from the table of contents.
  assert.equal(catalog.files.length, shippedManifest.entries.length + 1)
  assert.ok(catalog.files.some((file) => file.slug === 'index'))
})
