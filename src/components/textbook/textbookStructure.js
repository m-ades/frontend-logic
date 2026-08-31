/**
 * Course-scoped textbook structure: order, hierarchy, display titles.
 * Slugs stay tied to HTML filenames; numbering is computed at render time.
 *
 * Part / backmatter nodes are TOC dividers only (navigable: false). BookML may
 * legacy part files remain on disk but are not textbook destinations
 */

import textbookInventory from './textbookInventory.json'
import textbookManifest from './textbookManifest.json'
import { buildTextbookTocTree, listTextbookNavItems } from './textbookCatalog.js'
import { stripNumberPrefix } from './textbookTitles.js'

export const TEXTBOOK_STRUCTURE_STORAGE_KEY = 'logicapp_textbook_structure_v1'

const ROMAN = [
  '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
]

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

export function normalizeStructureNode(raw = {}) {
  const kind = raw.kind || 'chapter'
  const navigable = defaultNavigable(kind, raw.navigable)
  return {
    id: String(raw.id || createStructureNodeId()),
    slug: String(raw.slug || ''),
    file: defaultFile(raw, kind),
    kind,
    displayTitle: stripNumberPrefix(raw.displayTitle || raw.title || raw.pageTitle || raw.slug || ''),
    parentId: raw.parentId ?? null,
    sortIndex: Number.isFinite(Number(raw.sortIndex)) ? Number(raw.sortIndex) : 0,
    hidden: Boolean(raw.hidden),
    navigable,
  }
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
      slug: item.slug,
      file: item.file || `${item.slug}.html`,
      kind: item.kind,
      displayTitle: stripNumberPrefix(item.pageTitle || item.title || item.label || item.slug),
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

export function getTextbookInventory() {
  return textbookInventory
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

export function assignDynamicNumbers(tree = [], { includeHidden = false } = {}) {
  let partCount = 0
  let chapterCount = 0

  const mapNode = (node) => {
    if (!includeHidden && node.hidden) {
      return {
        ...node,
        number: null,
        label: node.displayTitle,
        children: (node.children || []).map(mapNode),
      }
    }

    let number = null
    let label = node.displayTitle

    if (isDividerKind(node.kind)) {
      if (!node.parentId) {
        partCount += 1
        number = ROMAN[partCount] || String(partCount)
        label = node.kind === 'backmatter'
          ? node.displayTitle
          : `Part ${number} ${node.displayTitle}`
      }
    } else if (node.kind === 'chapter' || node.kind === 'appendix') {
      chapterCount += 1
      number = String(chapterCount)
      label = `${number} ${node.displayTitle}`
    } else {
      label = node.displayTitle
    }

    return {
      ...node,
      number,
      label,
      children: (node.children || []).map(mapNode),
    }
  }

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
export function mergeInventory(existingNodes = [], inventoryFiles = textbookInventory.files) {
  const existing = existingNodes.map(normalizeStructureNode)
  const bySlug = new Map(existing.map((node) => [node.slug, node]))
  const inventorySlugs = new Set((inventoryFiles || []).map((file) => file.slug))

  const next = existing
    .filter((node) => {
      if (inventorySlugs.has(node.slug)) return true
      // Preserve instructor-created / non-inventory dividers
      if (isDividerKind(node.kind) && !isNavigableNode(node)) return true
      return false
    })
    .map((node) => {
      // Never promote dividers to navigable via stale stored JSON
      if (isDividerKind(node.kind)) {
        return normalizeStructureNode({ ...node, navigable: false })
      }
      return node
    })

  const present = new Set(next.map((node) => node.slug))
  let appendIndex = next.filter((node) => !node.parentId).length

  for (const file of inventoryFiles || []) {
    if (present.has(file.slug)) continue
    next.push(
      normalizeStructureNode({
        id: createStructureNodeId(),
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

  const missing = existing.filter(
    (node) =>
      !inventorySlugs.has(node.slug) &&
      !(isDividerKind(node.kind) && !isNavigableNode(node)),
  )
  return { nodes: next, missing, added: (inventoryFiles || []).filter((f) => !bySlug.has(f.slug)) }
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
  const tree = assignDynamicNumbers(nodesToTree(nodes, { includeHidden }), { includeHidden })
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
  return textbookManifest.defaultSlug || 'Ch1'
}

export function getManifestNavFallback() {
  return listTextbookNavItems()
}
