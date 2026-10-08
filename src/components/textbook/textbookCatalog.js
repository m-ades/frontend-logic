import bundledManifest from './textbookManifest.json' with { type: 'json' }
import { isUsableTextbookCatalog } from './bookmlCatalog.js'

// HuLA-side conveniences; they are not part of any bundle.
const BUILT_IN_ALIASES = {
  'chapter-1': 'Ch1',
  preface: 'Chx1',
  cover: 'index',
}

/*
purpose the catalog is swapped once a remote bundle loads
contract the bundled manifest stays the synchronous fallback so nothing renders empty
*/
let activeCatalog = bundledManifest

export function setActiveTextbookCatalog(catalog) {
  if (!isUsableTextbookCatalog(catalog)) return false
  activeCatalog = catalog
  return true
}

export function resetActiveTextbookCatalog() {
  activeCatalog = bundledManifest
}

export function getBundledTextbookManifest() {
  return bundledManifest
}

export function getTextbookManifest() {
  return activeCatalog
}

export function getTextbookAssetBase() {
  return activeCatalog.assetBase || bundledManifest.assetBase
}

function getAliasMap() {
  return { ...(activeCatalog.slugAliases || {}), ...BUILT_IN_ALIASES }
}

function getCoverEntry() {
  const entries = activeCatalog.entries || []
  return {
    key: 'cover',
    slug: 'index',
    file: 'index.html',
    title: 'Cover & contents',
    pageTitle: 'Cover & contents',
    kind: 'cover',
    partSlug: null,
    prev: null,
    next: entries[0]?.slug || null,
  }
}

export function normalizeTextbookSlug(rawSlug) {
  if (rawSlug === undefined) {
    return activeCatalog.defaultSlug || 'Ch1'
  }
  if (typeof rawSlug !== 'string') return null

  const trimmed = rawSlug.trim()
  if (!trimmed) return null
  const aliasMap = getAliasMap()
  if (aliasMap[trimmed]) return aliasMap[trimmed]
  if (aliasMap[trimmed.toLowerCase()]) return aliasMap[trimmed.toLowerCase()]

  // Accept case variants of known slugs (Linux-safe canonical casing).
  const entries = activeCatalog.entries || []
  const exact = entries.find((entry) => entry.slug === trimmed)
  if (exact) return exact.slug

  const ci = entries.find((entry) => entry.slug.toLowerCase() === trimmed.toLowerCase())
  if (ci) return ci.slug

  // Bare filenames accidentally including .html
  if (/\.html$/i.test(trimmed)) {
    return normalizeTextbookSlug(trimmed.replace(/\.html$/i, ''))
  }

  return trimmed === 'index' ? 'index' : null
}

export function getTextbookEntry(slug) {
  const normalized = normalizeTextbookSlug(slug)
  if (normalized === 'index') return getCoverEntry()
  const entries = activeCatalog.entries || []
  return entries.find((entry) => entry.slug === normalized) || null
}

export function getTextbookNeighbors(slug) {
  const entry = getTextbookEntry(slug)
  if (!entry) {
    return { prev: null, next: null, entry: null }
  }

  const resolveNeighbor = (neighborSlug) => {
    if (!neighborSlug) return null
    return getTextbookEntry(neighborSlug) || { slug: neighborSlug, title: neighborSlug }
  }

  return {
    entry,
    prev: resolveNeighbor(entry.prev),
    next: resolveNeighbor(entry.next),
  }
}

export function listTextbookNavItems() {
  const cover = { ...getCoverEntry(), label: 'Cover & contents' }

  const entries = (activeCatalog.entries || []).map((entry) => ({
    ...entry,
    label: entry.pageTitle || entry.title,
  }))

  return [cover, ...entries]
}

/**
 * Hierarchical TOC for hub + in-reader nav: cover/preface, then Parts with chapters.
 */
export function buildTextbookTocTree() {
  const items = listTextbookNavItems()
  const tree = []
  let currentPart = null

  for (const item of items) {
    if (item.kind === 'part' || item.kind === 'backmatter') {
      currentPart = {
        ...item,
        children: [],
      }
      tree.push(currentPart)
      continue
    }

    if (
      (item.kind === 'chapter' || item.kind === 'appendix') &&
      currentPart &&
      item.partSlug === currentPart.slug
    ) {
      currentPart.children.push(item)
      continue
    }

    // cover, preface, or orphans — top-level
    currentPart = null
    tree.push({ ...item, children: [] })
  }

  return tree
}

export function resolveTextbookAssetUrl(slug) {
  const normalized = normalizeTextbookSlug(slug)
  if (!normalized) return null
  const file = getTextbookEntry(normalized)?.file || `${normalized}.html`
  return `${getTextbookAssetBase()}/${file}`
}
