/**
 * Derive a textbook catalog from a BookML SCORM bundle.
 *
 * A bundle already describes itself: `index.html` carries the LaTeXML table of
 * contents (order, hierarchy, titles) and `imsmanifest.xml` carries the book
 * title, the export version and the full file list. Reading those two files
 * means the course owner can push the BookML output verbatim — nothing in the
 * bundle has to be hand-maintained for HuLA's sake.
 *
 * Parsing uses a tag scanner rather than DOMParser so the same code runs in the
 * browser at runtime and in the Node script that refreshes the bundled fallback
 * manifest. The input is machine-generated LaTeXML, not hand-written HTML.
 */

import { LOCAL_TEXTBOOK_BASE } from './textbookSource.js'
import { assignEntryKeys } from './textbookKeys.js'

// Appendices are deliberately absent: BookML reuses them for solution sets, so
// a synthesised "Appendix " prefix reads wrong under a "Solutions" divider. The
// build script recovers the real page titles when it can read the whole bundle.
const KIND_LABELS = {
  part: 'Part ',
  chapter: 'Chapter ',
}

// Gitbook chrome would restyle the HuLA shell, so it never reaches the page.
const CHROME_STYLESHEET = /^bookml\//i

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
}

export function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    const named = NAMED_ENTITIES[body.toLowerCase()]
    return named === undefined ? whole : named
  })
}

function textOf(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function attrValue(attrs, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs)
  if (!match) return null
  return decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')
}

/**
 * BookML names its output files by structural role, so the filename is the most
 * reliable signal for kind — the TOC's own classes are inconsistent (front and
 * back matter parts are emitted with chapter classes and vice versa).
 */
export function inferKindFromSlug(slug) {
  const stem = String(slug || '')
  if (stem === 'index') return 'cover'
  if (/^Chx\d*$/i.test(stem)) return 'preface'
  if (/^Ptx\d*$/i.test(stem)) return 'backmatter'
  if (/^Pt\d+$/i.test(stem)) return 'part'
  if (/^A\d+[a-z]?$/i.test(stem)) return 'appendix'
  if (/^Ch\d+$/i.test(stem)) return 'chapter'
  return null
}

function kindFromTocClass(attrs) {
  const className = attrValue(attrs, 'class') || ''
  const match = /\bltx_tocentry_([a-z]+)\b/i.exec(className)
  if (!match) return null
  const kind = match[1].toLowerCase()
  return kind === 'tocentry' ? null : kind
}

function sliceElement(html, openPattern, tagName) {
  const open = openPattern.exec(html)
  if (!open) return null

  const start = open.index + open[0].length
  const scanner = new RegExp(`<(/?)${tagName}\\b`, 'gi')
  scanner.lastIndex = start
  let depth = 1
  let token
  while ((token = scanner.exec(html))) {
    depth += token[1] ? -1 : 1
    if (depth === 0) return html.slice(start, token.index)
  }
  return html.slice(start)
}

/** The `<nav class="ltx_TOC">` block of a BookML index page. */
export function extractTocMarkup(indexHtml) {
  if (typeof indexHtml !== 'string') return null
  return sliceElement(
    indexHtml,
    /<nav\b[^>]*\bclass\s*=\s*["'][^"']*\bltx_TOC\b[^"']*["'][^>]*>/i,
    'nav',
  )
}

/**
 * Walk the TOC in document order, tracking `<ol>` nesting so parts keep their
 * chapters. Returns entries in reading order with hierarchy attached.
 */
export function parseBookmlToc(indexHtml) {
  const toc = extractTocMarkup(indexHtml)
  if (!toc) return []

  const entries = []
  const dividerByDepth = new Map()
  const token = /<(\/?)(ol|li|a)\b([^>]*?)\/?>/gi
  let depth = 0
  let pendingKind = null
  let pendingDepth = 0
  let match

  while ((match = token.exec(toc))) {
    const [, closing, tagRaw, attrs] = match
    const tag = tagRaw.toLowerCase()

    if (tag === 'ol') {
      depth += closing ? -1 : 1
      if (closing) {
        for (const level of [...dividerByDepth.keys()]) {
          if (level > depth) dividerByDepth.delete(level)
        }
      }
      continue
    }

    if (tag === 'li') {
      if (!closing) {
        pendingKind = kindFromTocClass(attrs)
        pendingDepth = depth
      }
      continue
    }

    if (closing || pendingKind === null) continue

    const href = attrValue(attrs, 'href')
    if (!href) continue
    const file = href.split(/[?#]/)[0]
    if (!/\.html$/i.test(file)) continue

    const end = toc.indexOf('</a>', token.lastIndex)
    const title = textOf(end === -1 ? '' : toc.slice(token.lastIndex, end))
    const tocKind = pendingKind
    pendingKind = null

    const slug = file.replace(/\.html$/i, '')
    if (!slug || slug === 'index') continue

    const kind = inferKindFromSlug(slug) || tocKind || 'chapter'
    const isDivider = kind === 'part' || kind === 'backmatter'

    let partSlug = null
    for (const [level, dividerSlug] of dividerByDepth) {
      if (level <= pendingDepth) partSlug = dividerSlug
    }
    if (isDivider) {
      dividerByDepth.set(pendingDepth, slug)
      partSlug = slug
    }

    entries.push({
      slug,
      file,
      title,
      kind,
      partSlug,
      prev: null,
      next: null,
      pageTitle: `${KIND_LABELS[kind] || ''}${title}`.trim(),
    })
  }

  return assignEntryKeys(chainNeighbors(entries))
}

/** Reading order drives prev/next; the cover sits in front of the first entry. */
export function chainNeighbors(entries) {
  return entries.map((entry, index) => ({
    ...entry,
    prev: index === 0 ? 'index' : entries[index - 1].slug,
    next: index === entries.length - 1 ? null : entries[index + 1].slug,
  }))
}

/** Content stylesheets declared by the bundle, minus the gitbook chrome. */
export function parseBookmlStylesheets(indexHtml) {
  if (typeof indexHtml !== 'string') return []
  const hrefs = []
  const link = /<link\b([^>]*?)\/?>/gi
  let match
  while ((match = link.exec(indexHtml))) {
    const attrs = match[1]
    if (!/\brel\s*=\s*["']?stylesheet\b/i.test(attrs)) continue
    const href = attrValue(attrs, 'href')
    if (!href) continue
    const rel = href.replace(/^\.\//, '')
    if (/^(https?:)?\/\//i.test(rel) || rel.startsWith('/')) continue
    if (CHROME_STYLESHEET.test(rel)) continue
    if (!hrefs.includes(rel)) hrefs.push(rel)
  }
  return hrefs
}

/** Book title, export version and the complete asset list. */
export function parseImsManifest(xml) {
  if (typeof xml !== 'string') return { bookTitle: null, version: null, files: [] }

  const manifestTag = /<manifest\b[^>]*>/i.exec(xml)
  const version = manifestTag ? attrValue(manifestTag[0], 'version') : null

  const titleMatch = /<(?:\w+:)?title\b[^>]*>([\s\S]*?)<\/(?:\w+:)?title>/i.exec(xml)
  const bookTitle = titleMatch ? textOf(titleMatch[1]) : null

  const files = []
  const file = /<file\b([^>]*?)\/?>/gi
  let match
  while ((match = file.exec(xml))) {
    const href = attrValue(match[1], 'href')
    if (href && !files.includes(href)) files.push(href)
  }

  return { bookTitle, version, files }
}

function inventoryFrom(files, entryBySlug) {
  return files
    .filter((file) => /\.html$/i.test(file) && !file.includes('/'))
    .map((file) => {
      const slug = file.replace(/\.html$/i, '')
      const entry = entryBySlug.get(slug)
      return {
        key: entry?.key || (slug === 'index' ? 'cover' : null),
        slug,
        file,
        kind: entry?.kind || inferKindFromSlug(slug) || 'chapter',
        displayTitle: slug === 'index'
          ? 'Cover & contents'
          : entry?.title || entry?.pageTitle || slug,
      }
    })
    .sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * Assemble the catalog the app reads: the shape of the bundled
 * textbookManifest.json, plus the file inventory used to reconcile
 * instructor-edited course structures.
 */
export function buildTextbookCatalog({
  indexHtml = '',
  imsManifestXml = '',
  assetBase = LOCAL_TEXTBOOK_BASE,
  source = 'derived',
} = {}) {
  const base = String(assetBase).replace(/\/+$/, '')
  const entries = parseBookmlToc(indexHtml)
  const ims = parseImsManifest(imsManifestXml)
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]))

  const htmlFiles = ims.files.length
    ? ims.files
    : ['index.html', ...entries.map((entry) => entry.file)]

  return {
    source,
    bookTitle: ims.bookTitle || 'Textbook',
    version: ims.version || null,
    defaultSlug: entries.find((entry) => entry.kind === 'chapter')?.slug
      || entries[0]?.slug
      || 'Ch1',
    assetBase: base,
    stylesheets: parseBookmlStylesheets(indexHtml).map((href) => `${base}/${href}`),
    entries,
    files: inventoryFrom(htmlFiles, entryBySlug),
    slugAliases: {},
  }
}

const PUBLISHED_CATALOG_FILE = 'hula-textbook.json'

async function fetchText(fetchImpl, url, signal) {
  const response = await fetchImpl(url, { signal, headers: { Accept: 'text/html, text/plain, */*' } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

/**
 * Load the catalog for a published bundle.
 *
 * Preferred: a `hula-textbook.json` the bundle publishes, which carries the real
 * per-chapter page titles. Failing that, derive everything from `index.html` and
 * `imsmanifest.xml`, so a verbatim BookML export works with nothing added.
 *
 * `assetBase` is always the base we resolved, never one the bundle names: a
 * published catalog must not be able to redirect the app to another origin.
 */
export async function loadRemoteTextbookCatalog(
  baseUrl,
  { signal = undefined, fetchImpl = fetch } = {},
) {
  const base = String(baseUrl).replace(/\/+$/, '')
  const url = (file) => `${base}/${file}`

  try {
    const raw = await fetchText(fetchImpl, url(PUBLISHED_CATALOG_FILE), signal)
    const parsed = JSON.parse(raw)
    const published = {
      ...parsed,
      entries: assignEntryKeys(parsed.entries || []),
      assetBase: base,
      source: 'published',
    }
    if (isUsableTextbookCatalog(published)) return published
  } catch {
    // Optional file; fall through to deriving the catalog from the bundle.
  }

  const [indexHtml, imsManifestXml] = await Promise.all([
    fetchText(fetchImpl, url('index.html'), signal),
    fetchText(fetchImpl, url('imsmanifest.xml'), signal).catch(() => ''),
  ])

  const catalog = buildTextbookCatalog({ indexHtml, imsManifestXml, assetBase: base })
  if (!isUsableTextbookCatalog(catalog)) {
    throw new Error(`No readable table of contents in ${url('index.html')}`)
  }
  return catalog
}

/**
 * Accept a catalog only if it can actually drive the reader, so a half-published
 * bundle cannot replace a working one.
 */
export function isUsableTextbookCatalog(catalog) {
  return Boolean(
    catalog
    && typeof catalog.assetBase === 'string'
    && catalog.assetBase
    && Array.isArray(catalog.entries)
    && catalog.entries.length > 0
    && catalog.entries.every((entry) => entry && typeof entry.slug === 'string' && entry.slug),
  )
}
