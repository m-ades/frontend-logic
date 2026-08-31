import textbookManifest from './textbookManifest.json'

const aliasMap = {
  ...(textbookManifest.slugAliases || {}),
  'chapter-1': 'Ch1',
  preface: 'Chx1',
  cover: 'index',
}

export function getTextbookManifest() {
  return textbookManifest
}

export function normalizeTextbookSlug(rawSlug) {
  if (!rawSlug || typeof rawSlug !== 'string') {
    return textbookManifest.defaultSlug || 'Ch1'
  }

  const trimmed = rawSlug.trim()
  if (aliasMap[trimmed]) return aliasMap[trimmed]
  if (aliasMap[trimmed.toLowerCase()]) return aliasMap[trimmed.toLowerCase()]

  // Accept case variants of known slugs (Linux-safe canonical casing).
  const entries = textbookManifest.entries || []
  const exact = entries.find((entry) => entry.slug === trimmed)
  if (exact) return exact.slug

  const ci = entries.find((entry) => entry.slug.toLowerCase() === trimmed.toLowerCase())
  if (ci) return ci.slug

  // Bare filenames accidentally including .html
  if (/\.html$/i.test(trimmed)) {
    return normalizeTextbookSlug(trimmed.replace(/\.html$/i, ''))
  }

  return trimmed
}

export function getTextbookEntry(slug) {
  const normalized = normalizeTextbookSlug(slug)
  if (normalized === 'index') {
    return {
      slug: 'index',
      file: 'index.html',
      title: 'Cover & contents',
      pageTitle: 'Cover & contents',
      kind: 'cover',
      prev: null,
      next: 'Chx1',
    }
  }
  const entries = textbookManifest.entries || []
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
  const cover = {
    slug: 'index',
    file: 'index.html',
    title: 'Cover & contents',
    pageTitle: 'Cover & contents',
    kind: 'cover',
    label: 'Cover & contents',
    partSlug: null,
    prev: null,
    next: 'Chx1',
    hasPracticeExercises: false,
    hasMath: false,
  }

  const entries = (textbookManifest.entries || []).map((entry) => ({
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
  if (normalized === 'index') {
    return `${textbookManifest.assetBase}/index.html`
  }
  return `${textbookManifest.assetBase}/${normalized}.html`
}
