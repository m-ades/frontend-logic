/**
 * Course-scoped textbook structure: order, hierarchy, display titles.
 * Slugs stay tied to HTML filenames; numbering is computed at render time.
 *
 * Part / backmatter nodes are TOC dividers only (navigable: false). BookML may
 * legacy part files remain on disk but are not textbook destinations
 */

import bundledInventory from './textbookInventory.json' with { type: 'json' }
import {
  buildTextbookTocTree,
  getTextbookManifest,
  listTextbookNavItems,
} from './textbookCatalog.js'
import { entryForKey, keyForSlug } from './textbookKeys.js'

export const TEXTBOOK_STRUCTURE_STORAGE_KEY = 'logicapp_textbook_structure_v1'

const DIVIDER_KINDS = new Set(['part', 'backmatter'])

export function createStructureNodeId() {
  return `tn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function isDividerKind(kind) {
  return DIVIDER_KINDS.has(kind)
}

export function isNavigableNode(node) {
  if (!node) return false
  if (typeof node.navigable === 'boolean') return node.navigable
  return !isDividerKind(node.kind)
}

function getStore(storageScope = 'local') {
  if (typeof window === 'undefined') return null
  try {
    return storageScope === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

function readAll(storageScope = 'local') {
  const store = getStore(storageScope)
  if (!store) return {}
  try {
    const raw = store.getItem(TEXTBOOK_STRUCTURE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map, storageScope = 'local') {
  const store = getStore(storageScope)
  if (!store) return
  try {
    store.setItem(TEXTBOOK_STRUCTURE_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

function defaultNavigable(kind, explicit) {
  if (typeof explicit === 'boolean') return explicit
  return !isDividerKind(kind)
}

function defaultFile(raw, kind) {
  if (raw.file === null || raw.file === '') return null
  if (raw.file) return String(raw.file)
  if (!raw.slug) return isDividerKind(kind) ? null : 'unknown.html'
  // Keep BookML part filenames for sync identity even though they are not navigable.
  return `${raw.slug}.html`
}

/*
purpose identity is the catalog key, not the BookML filename
contract rows written before keys existed are backfilled from the active catalog
*/
function resolveNodeKey(raw) {
  if (raw.key) return String(raw.key)
  return keyForSlug(getTextbookManifest().entries, raw.slug) || null
}

export function normalizeStructureNode(raw = {}) {
  const kind = raw.kind || 'chapter'
  const navigable = defaultNavigable(kind, raw.navigable)
  return {
    id: String(raw.id || createStructureNodeId()),
    key: resolveNodeKey(raw),
    slug: String(raw.slug || ''),
    file: defaultFile(raw, kind),
    kind,
    // Book entries take their label from the catalog at render time; this only
    // has to hold up for instructor-created sections, which have no book entry.
    displayTitle: String(raw.displayTitle || raw.title || raw.pageTitle || raw.slug || ''),
    parentId: raw.parentId ?? null,
    sortIndex: Number.isFinite(Number(raw.sortIndex)) ? Number(raw.sortIndex) : 0,
    hidden: Boolean(raw.hidden),
    navigable,
  }
}

/** The book's own label for a node, or the stored one for a custom section. */
export function labelForNode(node) {
  if (!node) return ''
  const entry = entryForKey(getTextbookManifest().entries, node.key)
  return entry?.title || node.displayTitle || node.slug || ''
}

/**
 * Create a HuLA-only section divider (no HTML file).
 */
export function createSectionDivider({
  displayTitle = 'New section',
  kind = 'part',
  sortIndex = 0,
} = {}) {
  const id = createStructureNodeId()
  return normalizeStructureNode({
    id,
    key: `section/${id.replace(/^tn-/, '')}`,
    slug: `section-${id.replace(/^tn-/, '')}`,
    file: null,
    kind: isDividerKind(kind) ? kind : 'part',
    displayTitle,
    parentId: null,
    sortIndex,
    hidden: false,
    navigable: false,
  })
}

/**
 * Seed flat nodes from the current BookML-derived TOC tree.
 */
export function seedStructureFromBundle() {
  const tree = buildTextbookTocTree()
  const nodes = []
  let rootIndex = 0

  const pushNode = (item, parentId, sortIndex) => {
    const node = normalizeStructureNode({
      id: createStructureNodeId(),
      key: item.key || null,
      slug: item.slug,
      file: item.file || `${item.slug}.html`,
      kind: item.kind,
      displayTitle: item.title || item.pageTitle || item.label || item.slug,
      parentId,
      sortIndex,
      hidden: false,
      navigable: !isDividerKind(item.kind),
    })
    nodes.push(node)
    return node
  }

  for (const item of tree) {
    const parent = pushNode(item, null, rootIndex++)
    const children = item.children || []
    children.forEach((child, index) => {
      pushNode(child, parent.id, index)
    })
  }

  return nodes
}

/*
purpose the file list instructors reconcile their course structure against
contract follows the active catalog so a republished bundle adds and drops files
*/
export function getTextbookInventory() {
  const catalog = getTextbookManifest()
  if (!Array.isArray(catalog.files) || catalog.files.length === 0) return bundledInventory
  return { assetBase: catalog.assetBase, files: catalog.files }
}

export function readCourseStructure(courseId, storageScope = 'local') {
  if (courseId == null) return null
  const all = readAll(storageScope)
  const key = String(courseId)
  if (!Object.prototype.hasOwnProperty.call(all, key)) return null
  const list = all[key]
  return Array.isArray(list) ? list.map(normalizeStructureNode) : []
}

export function writeCourseStructure(courseId, nodes, storageScope = 'local') {
  if (courseId == null) return
  const all = readAll(storageScope)
  all[String(courseId)] = (nodes || []).map(normalizeStructureNode)
  writeAll(all, storageScope)
}

export function clearCourseStructure(courseId, storageScope = 'local') {
  if (courseId == null) return
  const all = readAll(storageScope)
  delete all[String(courseId)]
  writeAll(all, storageScope)
}

export function getCourseStructureNodes(courseId, storageScope = 'local') {
  const overrides = readCourseStructure(courseId, storageScope)
  if (overrides) return overrides
  return seedStructureFromBundle()
}

export function nodesToTree(nodes = [], { includeHidden = true } = {}) {
  const list = (nodes || [])
    .map(normalizeStructureNode)
    .filter((node) => includeHidden || !node.hidden)

  const byParent = new Map()
  for (const node of list) {
    const key = node.parentId || '__root__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(node)
  }

  for (const [, siblings] of byParent) {
    siblings.sort((a, b) => a.sortIndex - b.sortIndex || a.slug.localeCompare(b.slug))
  }

  const build = (parentId) => {
    const siblings = byParent.get(parentId || '__root__') || []
    return siblings.map((node) => ({
      ...node,
      children: build(node.id),
    }))
  }

  return build(null)
}

export function treeToNodes(tree = [], parentId = null) {
  const nodes = []
  tree.forEach((node, index) => {
    const { children = [], ...rest } = node
    nodes.push(
      normalizeStructureNode({
        ...rest,
        parentId,
        sortIndex: index,
      }),
    )
    nodes.push(...treeToNodes(children, rest.id || node.id))
  })
  return nodes
}

export function readingOrder(tree = [], { includeHidden = false, navigableOnly = true } = {}) {
  const order = []
  const walk = (nodes) => {
    for (const node of nodes) {
      if (!includeHidden && node.hidden) continue
      if (!navigableOnly || isNavigableNode(node)) {
        order.push(node)
      }
      if (node.children?.length) walk(node.children)
    }
  }
  walk(tree)
  return order
}

/**
 * Attach the label each node shows in the table of contents.
 *
 * The label is the book's own — "12 Semantic concepts" — never a number
 * recomputed from position. A chapter's heading and every LaTeXML
 * cross-reference in the prose carry the book's numbering, so a TOC that
 * renumbered by position would contradict the page it links to. Reordering
 * changes reading order; it does not renumber the book.
 */
export function assignTocLabels(tree = []) {
  const mapNode = (node) => ({
    ...node,
    label: labelForNode(node),
    children: (node.children || []).map(mapNode),
  })

  return (tree || []).map(mapNode)
}

export function getNeighborsFromStructure(nodes, slug) {
  const tree = nodesToTree(nodes, { includeHidden: false })
  const order = readingOrder(tree, { includeHidden: false, navigableOnly: true })
  const index = order.findIndex((node) => node.slug === slug)
  if (index < 0) {
    return { prev: null, next: null, entry: null }
  }
  const entry = order[index]
  return {
    entry,
    prev: index > 0 ? order[index - 1] : null,
    next: index < order.length - 1 ? order[index + 1] : null,
  }
}

export function findStructureNode(nodes, slug) {
  return (nodes || []).find((node) => node.slug === slug) || null
}

function firstNavigableDescendant(node) {
  if (!node) return null
  for (const child of node.children || []) {
    if (isNavigableNode(child) && !child.hidden) return child
    const nested = firstNavigableDescendant(child)
    if (nested) return nested
  }
  return null
}

function findTreeNodeBySlug(tree, slug) {
  for (const node of tree || []) {
    if (node.slug === slug) return node
    const nested = findTreeNodeBySlug(node.children || [], slug)
    if (nested) return nested
  }
  return null
}

/**
 * Resolve a route slug to a navigable chapter.
 * dividers map to their first navigable child or the textbook hub
 */
export function resolveNavigableSlug(nodes, slug) {
  if (!slug) return null
  const tree = nodesToTree(nodes, { includeHidden: false })
  const node = findTreeNodeBySlug(tree, slug) || findStructureNode(nodes, slug)
  if (!node) return null
  if (isNavigableNode(node) && !node.hidden) return node.slug
  const child = firstNavigableDescendant(
    findTreeNodeBySlug(tree, slug) || { ...node, children: [] },
  )
  return child?.slug ?? null
}

/**
 * Merge disk inventory into existing structure.
 * Keeps titles/order for known slugs; appends new files; preserves custom dividers.
 */
/**
 * Reconcile a course structure against the published file list.
 *
 * Matching is by key, so a chapter that BookML renumbered from Ch13 to Ch12
 * keeps its position, visibility and practice links — only its filename moves.
 * A key that is gone is reported rather than silently dropped, so the instructor
 * can say whether it was deleted or retitled.
 */
export function mergeInventory(existingNodes = [], inventoryFiles = getTextbookInventory().files) {
  const existing = existingNodes.map(normalizeStructureNode)
  const files = inventoryFiles || []
  const byKey = new Map(files.filter((file) => file.key).map((file) => [file.key, file]))
  const bySlug = new Map(files.map((file) => [file.slug, file]))

  // Where the file list carries keys, a keyed node is matched only by key:
  // falling back to the filename would re-attach it to whichever chapter BookML
  // renumbered into that slot, which is the failure this is here to prevent.
  // A file list from before keys existed still matches by filename.
  const inventoryHasKeys = byKey.size > 0
  const matchFor = (node) =>
    (inventoryHasKeys && node.key ? byKey.get(node.key) : bySlug.get(node.slug)) || null

  const kept = []
  const missing = []

  for (const node of existing) {
    // Instructor-created sections have no file and are never reconciled away.
    if (isDividerKind(node.kind) && !isNavigableNode(node) && !node.file) {
      kept.push(node)
      continue
    }

    const match = matchFor(node)
    if (!match) {
      missing.push(node)
      continue
    }

    kept.push(
      normalizeStructureNode({
        ...node,
        // Follow the file wherever the export moved it.
        key: match.key || node.key,
        slug: match.slug,
        file: match.file,
        kind: match.kind,
        navigable: isDividerKind(match.kind) ? false : node.navigable,
      }),
    )
  }

  const claimed = new Set(kept.map((node) => node.key || node.slug))
  const added = files.filter((file) => !claimed.has(file.key || file.slug))

  const next = [...kept]
  let appendIndex = next.filter((node) => !node.parentId).length

  for (const file of added) {
    next.push(
      normalizeStructureNode({
        id: createStructureNodeId(),
        key: file.key,
        slug: file.slug,
        file: file.file,
        kind: file.kind,
        displayTitle: file.displayTitle,
        parentId: null,
        sortIndex: appendIndex++,
        hidden: false,
        navigable: !isDividerKind(file.kind),
      }),
    )
  }

  const byParent = new Map()
  for (const node of next) {
    const key = node.parentId || '__root__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(node)
  }
  for (const [, siblings] of byParent) {
    siblings
      .sort((a, b) => a.sortIndex - b.sortIndex || a.slug.localeCompare(b.slug))
      .forEach((node, index) => {
        node.sortIndex = index
      })
  }

  return { nodes: next, missing, added }
}

/** True when the structure already matches the published file list. */
export function isInventoryInSync(nodes, inventoryFiles) {
  const { missing, added } = mergeInventory(nodes, inventoryFiles)
  return missing.length === 0 && added.length === 0
}

export function canHaveChildren(kind) {
  return isDividerKind(kind)
}

export function canBeChildOf(childKind, parentKind) {
  if (!parentKind) return true
  if (!canHaveChildren(parentKind)) return false
  return childKind === 'chapter' || childKind === 'appendix'
}

export function listNumberedFlat(nodes, { includeHidden = true } = {}) {
  const tree = assignTocLabels(nodesToTree(nodes, { includeHidden }))
  const flat = []
  const walk = (list, depth = 0) => {
    for (const node of list) {
      flat.push({ ...node, depth })
      if (node.children?.length) walk(node.children, depth + 1)
    }
  }
  walk(tree)
  return flat
}

export function listNavigableNumberedFlat(nodes, { includeHidden = false } = {}) {
  return listNumberedFlat(nodes, { includeHidden }).filter(isNavigableNode)
}

export function getBundleDefaultSlug() {
  return getTextbookManifest().defaultSlug || 'Ch1'
}

export function getManifestNavFallback() {
  return listTextbookNavItems()
}
