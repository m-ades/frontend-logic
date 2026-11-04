import { useEffect, useRef, useState } from 'react'
import { fetchJson, getActiveUserId } from '../utils/api.js'
import { trackSave } from '../utils/savesInFlight.js'

export function useProofState({ userId = getActiveUserId() } = {}) {
  const [savedProofStates, setSavedProofStates] = useState({})
  const pendingSavesRef = useRef(new Map())
  const unmountedRef = useRef(false)

  const initializeSavedProofStates = (initialStates) => {
    setSavedProofStates((prev) => ({ ...prev, ...initialStates }))
  }

  const saveDraftNow = async (assignmentQuestionId, draftData) => {
    if (!assignmentQuestionId) return null
    clearTimeout(pendingSavesRef.current.get(assignmentQuestionId)?.timer)
    pendingSavesRef.current.delete(assignmentQuestionId)
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
    clearTimeout(pendingSavesRef.current.get(assignmentQuestionId)?.timer)
    const timer = setTimeout(() => {
      saveDraftNow(assignmentQuestionId, draftData).catch(() => {})
    }, 500)
    pendingSavesRef.current.set(assignmentQuestionId, { timer, draftData })
  }

  // leaving sends waiting saves now and editors flush after this so theirs go straight out too
  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      pendingSavesRef.current.forEach(({ draftData }, assignmentQuestionId) => {
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
