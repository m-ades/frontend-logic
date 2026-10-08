import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { fetchJson } from '@/utils/api.js'
import { normalizeTextbookBaseUrl } from '@/components/textbook/textbookSource.js'

const queryKey = (courseId) => ['textbook-source', courseId]
const apiPath = (courseId) => `/api/courses/${courseId}/textbook-source`

/**
 * Which published bundle this course reads.
 *
 * A course with no override follows the deploy default, so one course can stay
 * pinned to the version it started the term on while another follows the course
 * owner's latest publish.
 */
export function useCourseTextbookSource() {
  const runtime = useAppRuntime()
  const queryClient = useQueryClient()
  const isSandbox = Boolean(runtime?.isSandbox)
  const courseId = runtime?.courseState?.activeCourseId ?? runtime?.activeCourseId ?? null
  const courseIdForApi = isSandbox ? null : courseId

  const query = useQuery({
    queryKey: queryKey(courseIdForApi),
    queryFn: () => fetchJson(apiPath(courseIdForApi)),
    enabled: !isSandbox && courseIdForApi != null,
    staleTime: 5 * 60 * 1000,
  })

  const saveMutation = useMutation({
    mutationFn: (baseUrl) =>
      fetchJson(apiPath(courseIdForApi), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, updatedAt: query.data?.updatedAt ?? null }),
      }),
    onSuccess: (payload) => queryClient.setQueryData(queryKey(courseIdForApi), payload),
  })

  const clearMutation = useMutation({
    mutationFn: () => fetchJson(apiPath(courseIdForApi), { method: 'DELETE' }),
    onSuccess: (payload) => queryClient.setQueryData(queryKey(courseIdForApi), payload),
  })

  const save = useCallback((baseUrl) => saveMutation.mutateAsync(baseUrl), [saveMutation])
  const clear = useCallback(() => clearMutation.mutateAsync(), [clearMutation])

  return {
    courseId,
    // Re-validated client side: a stored row still has to clear the allowlist.
    baseUrl: normalizeTextbookBaseUrl(query.data?.baseUrl ?? null),
    usingDefaults: !query.data?.baseUrl,
    isLoading: !isSandbox && courseIdForApi != null && query.isLoading,
    isError: query.isError,
    save,
    clear,
  }
}
