import { useCallback, useMemo } from 'react'
import { createCourseScopedTextbookResource } from '@/hooks/useCourseScopedTextbookResource.js'
import {
  assignDynamicNumbers,
  clearCourseStructure,
  createSectionDivider,
  getCourseStructureNodes,
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
  const {
    courseId,
    storageScope,
    isSandbox,
    isLoading,
    isError,
    values: nodes,
    hasOverrides,
    usingDefaults,
    save: saveStructure,
    reset: resetToBundle,
  } = useStructureResource()

  const tree = useMemo(() => nodesToTree(nodes, { includeHidden: true }), [nodes])
  const visibleTree = useMemo(() => nodesToTree(nodes, { includeHidden: false }), [nodes])
  const numberedTree = useMemo(
    () => assignDynamicNumbers(visibleTree, { includeHidden: false }),
    [visibleTree],
  )
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

  const syncFiles = useCallback(async () => {
    const inventory = getTextbookInventory()
    const current = isSandbox
      ? getCourseStructureNodes(courseId, storageScope)
      : nodes
    const { nodes: merged, missing, added } = mergeInventory(current, inventory.files)
    await saveStructure(merged)
    return { nodes: merged, missing, added }
  }, [isSandbox, courseId, storageScope, nodes, saveStructure])

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
    saveStructure,
    resetToBundle,
    syncFiles,
    getNeighbors,
    resolveSlug,
    addSection,
    seedDefaults: seedStructureFromBundle,
  }
}
