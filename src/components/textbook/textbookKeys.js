/**
 * Stable identity for a textbook entry.
 *
 * BookML names its files by position — `Ch12.html` is the twelfth chapter, not
 * "Semantic concepts". Deleting or inserting a chapter therefore renumbers every
 * file after it, and anything keyed on the filename silently re-attaches to the
 * wrong chapter. Course structure and practice links key on this instead, and
 * the filename means only "where to fetch".
 *
 * A key is `kind/divider/title`, which survives insertion, deletion and
 * reordering, and changes only when the entry is retitled — the one case where
 * re-identifying it is the right answer. A bundle can publish an explicit `key`
 * to override that, which is the escape hatch for a deliberate retitle.
 */

import { stripNumberPrefix } from './textbookTitles.js'

export function slugifyTitle(title) {
  return stripNumberPrefix(String(title || ''))
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function derivedKey(entry, dividerTitle) {
  const scope = dividerTitle ? `${slugifyTitle(dividerTitle)}/` : ''
  const title = slugifyTitle(entry.title) || slugifyTitle(entry.pageTitle) || entry.slug.toLowerCase()
  return `${entry.kind}/${scope}${title}`
}

/**
 * Attach a key to every entry, in document order.
 *
 * Titles repeat inside a bundle — *forall x* has three pairs of identically
 * titled solution sets — so a repeat takes a `-2`, `-3` suffix by position. That
 * is stable unless one of the pair is deleted, which is as far as a derived key
 * can go; an explicit key in the bundle avoids it entirely.
 */
export function assignEntryKeys(entries = []) {
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]))
  const used = new Map()

  return entries.map((entry) => {
    if (entry.key) return entry

    const divider = entry.partSlug && entry.partSlug !== entry.slug
      ? bySlug.get(entry.partSlug)
      : null
    const base = derivedKey(entry, divider?.title)

    const seen = (used.get(base) || 0) + 1
    used.set(base, seen)

    return { ...entry, key: seen === 1 ? base : `${base}-${seen}` }
  })
}

/** Look a key up by filename, for course rows written before keys existed. */
export function keyForSlug(entries, slug) {
  if (!slug) return null
  return entries?.find((entry) => entry.slug === slug)?.key || null
}

/** Where a key currently lives, so a renumbered bundle still resolves. */
export function entryForKey(entries, key) {
  if (!key) return null
  return entries?.find((entry) => entry.key === key) || null
}
