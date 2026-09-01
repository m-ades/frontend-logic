/**
 * Course-scoped textbook ↔ practice links.
 *
 * Links are metadata (not HTML markers) so LaTeX → HTML re-renders do not wipe them.
 * A practice widget only appears when a resolved link exists for the current chapter.
 */

export const TEXTBOOK_LINKS_STORAGE_KEY = 'logicapp_textbook_practice_links_v1'

/**
 * Seed templates. Resolved against a course's practices by chapter/subchapter
 * (and optional explicit practiceId). Content-aligned with sandbox demos.
 */
export const DEFAULT_LINK_TEMPLATES = [
  {
    id: 'tpl-ch1-arguments',
    textbookSlug: 'Ch1',
    sectionId: 'Sx1',
    match: { chapter: 1, subchapter: '1.1' },
    label: 'Conceptual Understanding',
  },
  {
    id: 'tpl-ch2-scope',
    textbookSlug: 'Ch2',
    sectionId: null,
    match: { chapter: 1, subchapter: '1.1' },
    label: 'Conceptual Understanding',
  },
  {
    id: 'tpl-ch3-notions',
    textbookSlug: 'Ch3',
    sectionId: null,
    match: { chapter: 1, subchapter: '1.1' },
    label: 'Conceptual Understanding',
  },
  {
    id: 'tpl-ch5-connectives',
    textbookSlug: 'Ch5',
    sectionId: null,
    match: { chapter: 1, subchapter: '1.2' },
    label: 'Symbolic Translations',
  },
  {
    id: 'tpl-ch6-sentences',
    textbookSlug: 'Ch6',
    sectionId: null,
    match: { chapter: 1, subchapter: '1.2' },
    label: 'Symbolic Translations',
  },
  {
    id: 'tpl-ch11-truth-tables',
    textbookSlug: 'Ch11',
    sectionId: null,
    match: { chapter: 2, subchapter: '2.2' },
    label: 'Truth Tables',
  },
  {
    id: 'tpl-ch12-semantics',
    textbookSlug: 'Ch12',
    sectionId: null,
    match: { chapter: 2, subchapter: '2.2' },
    label: 'Truth Tables',
  },
  {
    id: 'tpl-ch15-partial',
    textbookSlug: 'Ch15',
    sectionId: null,
    match: { chapter: 2, subchapter: '2.2' },
    label: 'Truth Tables',
  },
  {
    id: 'tpl-ch17-nd',
    textbookSlug: 'Ch17',
    sectionId: null,
    match: { chapter: 2, subchapter: '2.1' },
    label: 'Natural Deductions',
  },
  {
    id: 'tpl-ch18-nd',
    textbookSlug: 'Ch18',
    sectionId: null,
    match: { chapter: 2, subchapter: '2.1' },
    label: 'Natural Deductions',
  },
]

function getStore(storageScope = 'local') {
  if (typeof window === 'undefined') return null
  try {
    return storageScope === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

function readAllOverrides(storageScope = 'local') {
  const store = getStore(storageScope)
  if (!store) return {}
  try {
    const raw = store.getItem(TEXTBOOK_LINKS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAllOverrides(map, storageScope = 'local') {
  const store = getStore(storageScope)
  if (!store) return
  try {
    store.setItem(TEXTBOOK_LINKS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode
  }
}

export function createLinkId() {
  return `link-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeLink(raw = {}) {
  const textbookSlug = String(raw.textbookSlug || raw.textbook_slug || '').trim()
  const practiceId =
    raw.practiceId != null && raw.practiceId !== ''
      ? raw.practiceId
      : raw.practice_id != null && raw.practice_id !== ''
        ? raw.practice_id
        : null

  const matchChapter = raw.match?.chapter ?? raw.chapter ?? null
  const matchSubchapter = raw.match?.subchapter ?? raw.subchapter ?? null

  return {
    id: String(raw.id || createLinkId()),
    textbookSlug,
    sectionId: raw.sectionId || raw.section_id || null,
    practiceId,
    match:
      matchChapter != null
        ? {
            chapter: Number(matchChapter),
            subchapter: matchSubchapter != null ? String(matchSubchapter) : null,
          }
        : null,
    label: raw.label || null,
  }
}

export function readCourseLinkOverrides(courseId, storageScope = 'local') {
  if (courseId == null) return null
  const all = readAllOverrides(storageScope)
  const key = String(courseId)
  if (!Object.prototype.hasOwnProperty.call(all, key)) return null
  const list = all[key]
  return Array.isArray(list) ? list.map(normalizeLink) : []
}

export function writeCourseLinkOverrides(courseId, links, storageScope = 'local') {
  if (courseId == null) return
  const all = readAllOverrides(storageScope)
  all[String(courseId)] = (links || []).map(normalizeLink)
  writeAllOverrides(all, storageScope)
}

export function clearCourseLinkOverrides(courseId, storageScope = 'local') {
  if (courseId == null) return
  const all = readAllOverrides(storageScope)
  delete all[String(courseId)]
  writeAllOverrides(all, storageScope)
}

/**
 * Effective link definitions for a course: saved overrides, else seed templates.
 */
export function getCourseLinkDefinitions(courseId, storageScope = 'local') {
  const overrides = readCourseLinkOverrides(courseId, storageScope)
  if (overrides) return overrides
  return DEFAULT_LINK_TEMPLATES.map(normalizeLink)
}

function practiceTitle(practice) {
  return practice?.title || practice?.name || 'Practice'
}

function comparePracticeCandidates(link, left, right) {
  const label = String(link.label || '').trim().toLowerCase()
  const leftMatchesLabel = String(practiceTitle(left)).trim().toLowerCase() === label
  const rightMatchesLabel = String(practiceTitle(right)).trim().toLowerCase() === label
  if (leftMatchesLabel !== rightMatchesLabel) return leftMatchesLabel ? -1 : 1

  return String(left.id).localeCompare(String(right.id), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function findPracticeForLink(link, practices = []) {
  if (!Array.isArray(practices) || practices.length === 0) return null

  if (link.practiceId != null) {
    const byId = practices.find((item) => String(item.id) === String(link.practiceId))
    if (byId) return byId
  }

  if (link.match?.chapter != null) {
    const chapter = Number(link.match.chapter)
    const sub = link.match.subchapter
    const candidates = practices.filter((item) => Number(item.chapter) === chapter)
    if (sub) {
      const exact = candidates
        .filter((item) => String(item.subchapter) === String(sub))
        .sort((left, right) => comparePracticeCandidates(link, left, right))
      if (exact.length) return exact[0]
    }
    return [...candidates].sort(
      (left, right) => comparePracticeCandidates(link, left, right),
    )[0] || null
  }

  return null
}

/**
 * Resolve definitions against available practices. Drops unresolved links
 * (so widgets only appear when a real practice exists).
 */
export function resolveTextbookPracticeLinks(definitions, practices = []) {
  const resolved = []
  const seen = new Set()

  for (const definition of definitions || []) {
    const link = normalizeLink(definition)
    if (!link.textbookSlug) continue

    const practice = findPracticeForLink(link, practices)
    if (!practice) continue

    const key = `${link.textbookSlug}::${practice.id}::${link.sectionId || ''}`
    if (seen.has(key)) continue
    seen.add(key)

    resolved.push({
      ...link,
      practiceId: practice.id,
      practiceTitle: link.label || practiceTitle(practice),
      practiceChapter: practice.chapter,
      practiceSubchapter: practice.subchapter,
      practiceKind: practice.kind || 'practice',
    })
  }

  return resolved
}

export function linksForTextbookSlug(resolvedLinks, slug) {
  if (!slug) return []
  const normalized = String(slug)
  return (resolvedLinks || []).filter(
    (link) => String(link.textbookSlug) === normalized,
  )
}

export function linksForPracticeId(resolvedLinks, practiceId) {
  if (practiceId == null) return []
  return (resolvedLinks || []).filter(
    (link) => String(link.practiceId) === String(practiceId),
  )
}

export function resolveWorksheetTextbookContext(practiceLinks, navigationState) {
  // only navigation from a linked chapter activates textbook context
  const requestedSlug = String(navigationState?.textbookSlug || '').trim()
  if (!requestedSlug) return null

  const linkedPractice = (practiceLinks || []).find(
    (link) => String(link.textbookSlug) === requestedSlug,
  )
  // stale and unrelated navigation state leaves the worksheet standalone
  if (!linkedPractice) return null

  return {
    textbookSlug: linkedPractice.textbookSlug,
    sectionId: navigationState?.textbookSectionId || linkedPractice.sectionId || null,
  }
}
