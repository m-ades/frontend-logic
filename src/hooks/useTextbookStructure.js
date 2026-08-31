import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { fetchJson } from '@/utils/api.js'
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

function structureQueryKey(courseId) {
  return ['textbook-structure', courseId]
}

/**
 * Course-scoped textbook structure (order, titles, hierarchy) + computed numbers.
 * Live mode uses the API; sandbox keeps sessionStorage.
 */
export function useTextbookStructure() {
  const runtime = useAppRuntime()
  const queryClient = useQueryClient()
  const isSandbox = Boolean(runtime?.isSandbox)
  const storageScope = runtime?.storageScope === 'session' ? 'session' : 'local'
  const courseId = runtime?.courseState?.activeCourseId ?? runtime?.activeCourseId ?? null
  const courseIdForApi = isSandbox ? null : courseId

  const [sandboxRevision, setSandboxRevision] = useState(0)
  const migratedRef = useRef(new Set())

  const structureQuery = useQuery({
    queryKey: structureQueryKey(courseIdForApi),
    queryFn: () => fetchJson(`/api/courses/${courseIdForApi}/textbook-structure`),
    enabled: !isSandbox && courseIdForApi != null,
  })

  // One-time migrate any prior localStorage overrides into the API.
  useEffect(() => {
    if (isSandbox || courseIdForApi == null || structureQuery.isLoading) return
    if (structureQuery.data?.nodes != null) return
    const key = String(courseIdForApi)
    if (migratedRef.current.has(key)) return

    const local = readCourseStructure(courseIdForApi, 'local')
    if (!local?.length) {
      migratedRef.current.add(key)
      return
    }

    migratedRef.current.add(key)
    fetchJson(`/api/courses/${courseIdForApi}/textbook-structure`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: local.map(normalizeStructureNode) }),
    })
      .then((payload) => {
        queryClient.setQueryData(structureQueryKey(courseIdForApi), payload)
        clearCourseStructure(courseIdForApi, 'local')
      })
      .catch(() => {
        migratedRef.current.delete(key)
      })
  }, [
    isSandbox,
    courseIdForApi,
    structureQuery.isLoading,
    structureQuery.data?.nodes,
    queryClient,
  ])

  const saveMutation = useMutation({
    mutationFn: async (nextNodes) => {
      const nodes = (nextNodes || []).map(normalizeStructureNode)
      return fetchJson(`/api/courses/${courseIdForApi}/textbook-structure`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      })
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(structureQueryKey(courseIdForApi), payload)
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () =>
      fetchJson(`/api/courses/${courseIdForApi}/textbook-structure`, {
        method: 'DELETE',
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(structureQueryKey(courseIdForApi), payload)
    },
  })

  const sandboxNodes = useMemo(() => {
    void sandboxRevision
    if (!isSandbox) return null
    return getCourseStructureNodes(courseId, storageScope)
  }, [isSandbox, courseId, storageScope, sandboxRevision])

  const hasOverrides = useMemo(() => {
    void sandboxRevision
    if (isSandbox) return readCourseStructure(courseId, storageScope) != null
    return Array.isArray(structureQuery.data?.nodes)
  }, [isSandbox, courseId, storageScope, sandboxRevision, structureQuery.data])

  const nodes = useMemo(() => {
    if (isSandbox) return sandboxNodes || seedStructureFromBundle()
    if (structureQuery.isError) return []
    if (Array.isArray(structureQuery.data?.nodes)) {
      return structureQuery.data.nodes.map(normalizeStructureNode)
    }
    return seedStructureFromBundle()
  }, [isSandbox, sandboxNodes, structureQuery.data, structureQuery.isError])

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

  const saveStructure = useCallback(
    async (nextNodes) => {
      const normalized = (nextNodes || []).map(normalizeStructureNode)
      if (isSandbox) {
        writeCourseStructure(courseId, normalized, storageScope)
        setSandboxRevision((value) => value + 1)
        return normalized
      }
      const payload = await saveMutation.mutateAsync(normalized)
      return payload.nodes
    },
    [isSandbox, courseId, storageScope, saveMutation],
  )

  const resetToBundle = useCallback(async () => {
    if (isSandbox) {
      clearCourseStructure(courseId, storageScope)
      setSandboxRevision((value) => value + 1)
      return
    }
    await resetMutation.mutateAsync()
  }, [isSandbox, courseId, storageScope, resetMutation])

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
    isLoading: !isSandbox && structureQuery.isLoading,
    isError: !isSandbox && structureQuery.isError,
    nodes,
    tree,
    visibleTree,
    numberedTree,
    numberedFlat,
    studentFlat,
    navigableFlat,
    hasOverrides,
    usingDefaults: !hasOverrides,
    saveStructure,
    resetToBundle,
    syncFiles,
    getNeighbors,
    resolveSlug,
    addSection,
    seedDefaults: seedStructureFromBundle,
  }
}
