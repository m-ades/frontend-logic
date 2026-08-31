import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { fetchJson } from '@/utils/api.js'

/** creates a course scoped textbook resource hook */
export function createCourseScopedTextbookResource({
  resourceName,
  responseField,
  normalize,
  readOverrides,
  writeOverrides,
  clearOverrides,
  getDefaults,
}) {
  const queryKey = (courseId) => [resourceName, courseId]
  const apiPath = (courseId) => `/api/courses/${courseId}/${resourceName}`
  const normalizeValues = (values) => (values || []).map(normalize)

  return function useCourseScopedTextbookResource() {
    const runtime = useAppRuntime()
    const queryClient = useQueryClient()
    const isSandbox = Boolean(runtime?.isSandbox)
    const storageScope = runtime?.storageScope === 'session' ? 'session' : 'local'
    const courseId = runtime?.courseState?.activeCourseId ?? runtime?.activeCourseId ?? null
    const courseIdForApi = isSandbox ? null : courseId

    const [sandboxRevision, setSandboxRevision] = useState(0)
    const migratedRef = useRef(new Set())
    const writeQueueRef = useRef(Promise.resolve())
    const enqueueWrite = useCallback((write) => {
      const pending = writeQueueRef.current.catch(() => {}).then(write)
      writeQueueRef.current = pending
      return pending
    }, [])

    const resourceQuery = useQuery({
      queryKey: queryKey(courseIdForApi),
      queryFn: () => fetchJson(apiPath(courseIdForApi)),
      enabled: !isSandbox && courseIdForApi != null,
    })

    useEffect(() => {
      if (isSandbox || courseIdForApi == null || resourceQuery.isLoading) return
      if (resourceQuery.data?.[responseField] != null) return

      const migrationKey = String(courseIdForApi)
      if (migratedRef.current.has(migrationKey)) return

      const localValues = readOverrides(courseIdForApi, 'local')
      if (!localValues?.length) {
        migratedRef.current.add(migrationKey)
        return
      }

      migratedRef.current.add(migrationKey)
      enqueueWrite(() =>
        fetchJson(apiPath(courseIdForApi), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [responseField]: normalizeValues(localValues),
            updatedAt: resourceQuery.data?.updatedAt ?? null,
          }),
        }),
      )
        .then((payload) => {
          queryClient.setQueryData(queryKey(courseIdForApi), payload)
          clearOverrides(courseIdForApi, 'local')
        })
        .catch(() => {
          migratedRef.current.delete(migrationKey)
        })
    }, [
      isSandbox,
      courseIdForApi,
      resourceQuery.isLoading,
      resourceQuery.data,
      queryClient,
      enqueueWrite,
    ])

    const saveMutation = useMutation({
      mutationFn: async ({ nextValues, updatedAt }) =>
        fetchJson(apiPath(courseIdForApi), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [responseField]: normalizeValues(nextValues),
            updatedAt,
          }),
        }),
      onSuccess: (payload) => {
        queryClient.setQueryData(queryKey(courseIdForApi), payload)
      },
    })

    const resetMutation = useMutation({
      mutationFn: async () =>
        fetchJson(apiPath(courseIdForApi), {
          method: 'DELETE',
        }),
      onSuccess: (payload) => {
        queryClient.setQueryData(queryKey(courseIdForApi), payload)
      },
    })

    const sandboxOverrides = useMemo(() => {
      void sandboxRevision
      if (!isSandbox) return null
      return readOverrides(courseId, storageScope)
    }, [isSandbox, courseId, storageScope, sandboxRevision])

    const hasOverrides = useMemo(() => {
      void sandboxRevision
      if (isSandbox) return sandboxOverrides != null
      return Array.isArray(resourceQuery.data?.[responseField])
    }, [isSandbox, sandboxOverrides, sandboxRevision, resourceQuery.data])

    const values = useMemo(() => {
      if (isSandbox) {
        return sandboxOverrides == null ? normalizeValues(getDefaults()) : sandboxOverrides
      }
      if (resourceQuery.isError) return []
      if (Array.isArray(resourceQuery.data?.[responseField])) {
        return normalizeValues(resourceQuery.data[responseField])
      }
      return normalizeValues(getDefaults())
    }, [isSandbox, sandboxOverrides, resourceQuery.data, resourceQuery.isError])

    const save = useCallback(
      async (nextValues) => {
        const normalized = normalizeValues(nextValues)
        if (isSandbox) {
          writeOverrides(courseId, normalized, storageScope)
          setSandboxRevision((value) => value + 1)
          return normalized
        }
        const payload = await enqueueWrite(() => {
          const current = queryClient.getQueryData(queryKey(courseIdForApi))
          return saveMutation.mutateAsync({
            nextValues: normalized,
            updatedAt: current?.updatedAt ?? null,
          })
        })
        return payload[responseField]
      },
      [
        isSandbox,
        courseId,
        courseIdForApi,
        storageScope,
        saveMutation,
        queryClient,
        enqueueWrite,
      ],
    )

    const reset = useCallback(async () => {
      if (isSandbox) {
        clearOverrides(courseId, storageScope)
        setSandboxRevision((value) => value + 1)
        return
      }
      await enqueueWrite(() => resetMutation.mutateAsync())
    }, [isSandbox, courseId, storageScope, resetMutation, enqueueWrite])

    return {
      courseId,
      storageScope,
      isSandbox,
      isLoading: !isSandbox && resourceQuery.isLoading,
      isError: !isSandbox && resourceQuery.isError,
      values,
      hasOverrides,
      usingDefaults: !hasOverrides,
      save,
      reset,
    }
  }
}
