import { useCallback, useMemo } from 'react'
import { createCourseScopedTextbookResource } from '@/hooks/useCourseScopedTextbookResource.js'
import { useTextbookCatalog } from '@/hooks/useTextbookCatalog.js'
import {
  assignTocLabels,
  clearCourseStructure,
  createSectionDivider,
  getNeighborsFromStructure,
  getTextbookInventory,
  listNavigableNumberedFlat,
  listNumberedFlat,
  mergeInventory,
  nodesToTree,
  normalizeStructureNode,
  readCourseStructure,
  resolveNavigableSlug,
  seedStructureFromBundle,
  writeCourseStructure,
} from '@/components/textbook/textbookStructure.js'

const useStructureResource = createCourseScopedTextbookResource({
  resourceName: 'textbook-structure',
  responseField: 'nodes',
  normalize: normalizeStructureNode,
  readOverrides: readCourseStructure,
  writeOverrides: writeCourseStructure,
  clearOverrides: clearCourseStructure,
  getDefaults: seedStructureFromBundle,
})

/**
 * Course-scoped textbook structure (order, titles, hierarchy) + computed numbers.
 * Live mode uses the API; sandbox keeps sessionStorage.
 */
export function useTextbookStructure() {
  // Defaults are seeded from the active catalog, so a course with no overrides
  // has to re-seed once a remote bundle replaces the shipped manifest.
  const { catalog, isReady: catalogReady, isLoading: catalogLoading } = useTextbookCatalog()

  const {
    courseId,
    storageScope,
    isSandbox,
    isLoading: structureLoading,
    isError,
    values: storedNodes,
    hasOverrides,
    usingDefaults,
    save: saveStructure,
    reset: resetToBundle,
  } = useStructureResource(catalog)

  const isLoading = structureLoading || catalogLoading

  /*
  purpose keep the course structure in step with the published bundle
  contract reconciliation is continuous and in memory; it persists on the next save
  */
  const reconciled = useMemo(() => {
    if (!catalogReady) return { nodes: storedNodes, missing: [], added: [] }
    return mergeInventory(storedNodes, getTextbookInventory().files)
  }, [storedNodes, catalogReady, catalog])

  const nodes = reconciled.nodes
  const pendingSync = useMemo(
    () => ({ missing: reconciled.missing, added: reconciled.added }),
    [reconciled],
  )

  const tree = useMemo(() => nodesToTree(nodes, { includeHidden: true }), [nodes])
  const visibleTree = useMemo(() => nodesToTree(nodes, { includeHidden: false }), [nodes])
  const numberedTree = useMemo(() => assignTocLabels(visibleTree), [visibleTree])
  const numberedFlat = useMemo(
    () => listNumberedFlat(nodes, { includeHidden: true }),
    [nodes],
  )
  const studentFlat = useMemo(
    () => listNumberedFlat(nodes, { includeHidden: false }),
    [nodes],
  )
  const navigableFlat = useMemo(
    () => listNavigableNumberedFlat(nodes, { includeHidden: false }),
    [nodes],
  )

  const getNeighbors = useCallback(
    (slug) => getNeighborsFromStructure(nodes, slug),
    [nodes],
  )

  const resolveSlug = useCallback(
    (slug) => resolveNavigableSlug(nodes, slug),
    [nodes],
  )

  const addSection = useCallback(
    async (displayTitle = 'New section') => {
      const rootCount = nodes.filter((node) => !node.parentId).length
      const section = createSectionDivider({ displayTitle, sortIndex: rootCount })
      return saveStructure([...nodes, section])
    },
    [nodes, saveStructure],
  )

  return {
    courseId,
    storageScope,
    isSandbox,
    catalog,
    catalogReady,
    isLoading,
    isError,
    nodes,
    tree,
    visibleTree,
    numberedTree,
    numberedFlat,
    studentFlat,
    navigableFlat,
    hasOverrides,
    usingDefaults,
    pendingSync,
    saveStructure,
    resetToBundle,
    getNeighbors,
    resolveSlug,
    addSection,
    seedDefaults: seedStructureFromBundle,
  }
}
