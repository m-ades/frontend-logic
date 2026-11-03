import { useEffect, useRef, useState } from 'react'
import { fetchJson, getActiveUserId } from '../utils/api.js'
import { trackSave } from '../utils/savesInFlight.js'

export function useProofState({ userId = getActiveUserId() } = {}) {
  const [savedProofStates, setSavedProofStates] = useState({})
  const saveTimersRef = useRef({})
  const pendingDraftsRef = useRef(new Map())
  const unmountedRef = useRef(false)

  const initializeSavedProofStates = (initialStates) => {
    setSavedProofStates((prev) => ({ ...prev, ...initialStates }))
  }

  const saveDraftNow = async (assignmentQuestionId, draftData) => {
    if (!assignmentQuestionId) return null
    if (saveTimersRef.current[assignmentQuestionId]) {
      clearTimeout(saveTimersRef.current[assignmentQuestionId])
      delete saveTimersRef.current[assignmentQuestionId]
    }
    pendingDraftsRef.current.delete(assignmentQuestionId)
    return trackSave(fetchJson('/api/assignment-drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_question_id: assignmentQuestionId,
        user_id: userId,
        draft_data: draftData,
      }),
    }))
  }

  const scheduleDraftSave = (assignmentQuestionId, draftData) => {
    if (!assignmentQuestionId) return
    if (unmountedRef.current) {
      saveDraftNow(assignmentQuestionId, draftData).catch(() => {})
      return
    }
    if (saveTimersRef.current[assignmentQuestionId]) {
      clearTimeout(saveTimersRef.current[assignmentQuestionId])
    }
    pendingDraftsRef.current.set(assignmentQuestionId, draftData)
    saveTimersRef.current[assignmentQuestionId] = setTimeout(async () => {
      try {
        await saveDraftNow(assignmentQuestionId, draftData)
      } catch {
        // ignore autosave errors
      }
    }, 500)
  }

  // leaving sends waiting saves now and editors flush after this so theirs go straight out too
  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      pendingDraftsRef.current.forEach((draftData, assignmentQuestionId) => {
        saveDraftNow(assignmentQuestionId, draftData).catch(() => {})
      })
    }
  }, [])

  const handleProofStateChange = (proofId, state, meta = {}) => {
    if (meta.assignmentQuestionId && meta.immediate) {
      return saveDraftNow(meta.assignmentQuestionId, state).then((result) => {
        setSavedProofStates(prev => ({
          ...prev,
          [proofId]: state
        }))
        return result
      })
    }
    setSavedProofStates(prev => ({
      ...prev,
      [proofId]: state
    }))
    if (meta.assignmentQuestionId) {
      scheduleDraftSave(meta.assignmentQuestionId, state)
    }
    return Promise.resolve(null)
  }

  const getSavedProofState = (proofId) => {
    return savedProofStates[proofId] || null
  }

  return {
    getSavedProofState,
    handleProofStateChange,
    initializeSavedProofStates,
  }
}
