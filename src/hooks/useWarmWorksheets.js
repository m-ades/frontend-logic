import { useQueries } from '@tanstack/react-query'
import { getActiveUserId } from '@/utils/api.js'
import { worksheetQuery } from '@/context/CoursesContext.jsx'

// keeps these assignments loaded while the page shows so opening one is instant
export function useWarmWorksheets(assignmentIds) {
  const userId = getActiveUserId()
  useQueries({
    queries: assignmentIds.map((assignmentId) => ({
      ...worksheetQuery(assignmentId, userId),
      notifyOnChangeProps: [],
    })),
  })
}
