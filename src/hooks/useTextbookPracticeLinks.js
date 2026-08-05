import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { fetchJson } from '@/utils/api.js'
import {
  clearCourseLinkOverrides,
  DEFAULT_LINK_TEMPLATES,
  getCourseLinkDefinitions,
  normalizeLink,
  readCourseLinkOverrides,
  resolveTextbookPracticeLinks,
  writeCourseLinkOverrides,
} from '@/components/textbook/textbookPracticeLinks.js'

function linksQueryKey(courseId) {
  return ['textbook-practice-links', courseId]
}

/**
 * Course-scoped textbook ↔ practice links.
 * Live mode uses the API; sandbox keeps sessionStorage.
 */
export function useTextbookPracticeLinks() {
  const runtime = useAppRuntime()
  const queryClient = useQueryClient()
  const isSandbox = Boolean(runtime?.isSandbox)
  const storageScope = runtime?.storageScope === 'session' ? 'session' : 'local'
  const courseId = runtime?.courseState?.activeCourseId ?? runtime?.activeCourseId ?? null
  const courseIdForApi = isSandbox ? null : courseId

  const practices = useMemo(() => {
    const fromState = runtime?.courseState?.practicesByCourse?.[courseId]
    if (Array.isArray(fromState)) return fromState
    if (Array.isArray(runtime?.practices)) return runtime.practices
    if (Array.isArray(runtime?.sandbox?.practices)) return runtime.sandbox.practices
    return []
  }, [runtime, courseId])

  const [sandboxRevision, setSandboxRevision] = useState(0)
  const migratedRef = useRef(new Set())

  const linksQuery = useQuery({
    queryKey: linksQueryKey(courseIdForApi),
    queryFn: () => fetchJson(`/api/courses/${courseIdForApi}/textbook-practice-links`),
    enabled: !isSandbox && courseIdForApi != null,
  })

  // One-time migrate any prior localStorage overrides into the API.
  useEffect(() => {
    if (isSandbox || courseIdForApi == null || linksQuery.isLoading) return
    if (linksQuery.data?.links != null) return
    const key = String(courseIdForApi)
    if (migratedRef.current.has(key)) return

    const local = readCourseLinkOverrides(courseIdForApi, 'local')
    if (!local) {
      migratedRef.current.add(key)
      return
    }

    migratedRef.current.add(key)
    fetchJson(`/api/courses/${courseIdForApi}/textbook-practice-links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: local.map(normalizeLink) }),
    })
      .then((payload) => {
        queryClient.setQueryData(linksQueryKey(courseIdForApi), payload)
        clearCourseLinkOverrides(courseIdForApi, 'local')
      })
      .catch(() => {
        migratedRef.current.delete(key)
      })
  }, [
    isSandbox,
    courseIdForApi,
    linksQuery.isLoading,
    linksQuery.data?.links,
    queryClient,
  ])

  const saveMutation = useMutation({
    mutationFn: async (nextLinks) => {
      const links = (nextLinks || []).map(normalizeLink)
      return fetchJson(`/api/courses/${courseIdForApi}/textbook-practice-links`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links }),
      })
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(linksQueryKey(courseIdForApi), payload)
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () =>
      fetchJson(`/api/courses/${courseIdForApi}/textbook-practice-links`, {
        method: 'DELETE',
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(linksQueryKey(courseIdForApi), payload)
    },
  })

  const sandboxDefinitions = useMemo(() => {
    void sandboxRevision
    if (!isSandbox) return null
    return getCourseLinkDefinitions(courseId, storageScope)
  }, [isSandbox, courseId, storageScope, sandboxRevision])

  const hasOverrides = useMemo(() => {
    void sandboxRevision
    if (isSandbox) return readCourseLinkOverrides(courseId, storageScope) != null
    return Array.isArray(linksQuery.data?.links)
  }, [isSandbox, courseId, storageScope, sandboxRevision, linksQuery.data])

  const definitions = useMemo(() => {
    if (isSandbox) return sandboxDefinitions || []
    if (Array.isArray(linksQuery.data?.links)) {
      return linksQuery.data.links.map(normalizeLink)
    }
    return DEFAULT_LINK_TEMPLATES.map(normalizeLink)
  }, [isSandbox, sandboxDefinitions, linksQuery.data])

  const resolvedLinks = useMemo(
    () => resolveTextbookPracticeLinks(definitions, practices),
    [definitions, practices],
  )

  const saveLinks = useCallback(
    async (nextLinks) => {
      const normalized = (nextLinks || []).map(normalizeLink)
      if (isSandbox) {
        writeCourseLinkOverrides(courseId, normalized, storageScope)
        setSandboxRevision((value) => value + 1)
        return normalized
      }
      const payload = await saveMutation.mutateAsync(normalized)
      return payload.links
    },
    [isSandbox, courseId, storageScope, saveMutation],
  )

  const resetToDefaults = useCallback(async () => {
    if (isSandbox) {
      clearCourseLinkOverrides(courseId, storageScope)
      setSandboxRevision((value) => value + 1)
      return
    }
    await resetMutation.mutateAsync()
  }, [isSandbox, courseId, storageScope, resetMutation])

  return {
    courseId,
    storageScope,
    isSandbox,
    isLoading: !isSandbox && linksQuery.isLoading,
    isError: !isSandbox && linksQuery.isError,
    practices,
    definitions,
    resolvedLinks,
    hasOverrides,
    saveLinks,
    resetToDefaults,
    usingDefaults: !hasOverrides,
  }
}
