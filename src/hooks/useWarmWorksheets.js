import { useQueries } from '@tanstack/react-query'
import { fetchJson, getActiveUserId } from '@/utils/api.js'
import { savesSettled } from '@/utils/savesInFlight.js'

// short since saved answers can change on another device after a prefetch
const WORKSHEET_FRESH_MS = 60 * 1000

export const worksheetQuery = (assignmentId, userId) => ({
  queryKey: ['worksheet', assignmentId, userId],
  queryFn: async () => {
    // a draft or check still saving from a visit just left has to land before it is read back
    await savesSettled()
    const [detail, drafts, submissions] = await Promise.all([
      fetchJson(`/api/assignments/${assignmentId}?userId=${userId}`),
      // saved work is best effort so a failed load opens blank
      fetchJson(`/api/assignment-drafts?assignmentId=${assignmentId}`).catch(() => []),
      fetchJson(`/api/assignments/${assignmentId}/submissions?userId=${userId}`).catch(() => []),
    ])
    return { detail, drafts, submissions }
  },
  staleTime: WORKSHEET_FRESH_MS,
  // copies kept warm on a page refresh as they go stale so opening one never waits
  refetchInterval: WORKSHEET_FRESH_MS,
})

// keeps these assignments loaded while the page shows so opening one is instant
export function useWarmWorksheets(assignmentIds) {
  const userId = getActiveUserId()
  useQueries({
    queries: assignmentIds.map((assignmentId) => ({
      ...worksheetQuery(assignmentId, userId),
      retry: false,
      notifyOnChangeProps: [],
    })),
  })
}
