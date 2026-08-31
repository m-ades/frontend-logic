import { useEffect } from 'react'
import { fetchJson } from '@/utils/api.js'

/*
purpose records time spent in one assignment across every worksheet surface
contract valid assignment and user ids open one session and cleanup closes it
error behavior tracking failures never block assignment work
*/
export function useAssignmentSession(assignmentId, userId) {
  useEffect(() => {
    if (assignmentId == null || userId == null) return undefined

    let disposed = false
    let activeSessionId = null

    const closeSession = async (sessionId) => {
      if (sessionId == null) return
      try {
        await fetchJson(`/api/assignment-sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ended_at: new Date().toISOString() }),
        })
      } catch {
        // tracking is best effort
      }
    }

    const startSession = async () => {
      try {
        const session = await fetchJson('/api/assignment-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_id: assignmentId,
            user_id: userId,
            started_at: new Date().toISOString(),
          }),
        })
        const sessionId = session?.id ?? null
        if (disposed) {
          void closeSession(sessionId)
          return
        }
        activeSessionId = sessionId
      } catch {
        // tracking is best effort
      }
    }

    void startSession()

    return () => {
      disposed = true
      const sessionId = activeSessionId
      activeSessionId = null
      void closeSession(sessionId)
    }
  }, [assignmentId, userId])
}
