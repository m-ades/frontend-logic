import { useRef, useState } from 'react'
import { API_CONFIG, fetchJson } from '../utils/api.js'

export function useProofState({ userId = API_CONFIG.userId } = {}) {
  const [savedProofStates, setSavedProofStates] = useState({})
  const saveTimersRef = useRef({})

  const initializeSavedProofStates = (initialStates) => {
    setSavedProofStates((prev) => ({ ...prev, ...initialStates }))
  }

  const scheduleDraftSave = (assignmentQuestionId, draftData) => {
    if (!assignmentQuestionId) return
    if (saveTimersRef.current[assignmentQuestionId]) {
      clearTimeout(saveTimersRef.current[assignmentQuestionId])
    }
    saveTimersRef.current[assignmentQuestionId] = setTimeout(async () => {
      try {
        await fetchJson('/api/assignment-drafts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_question_id: assignmentQuestionId,
            user_id: userId,
            draft_data: draftData,
          }),
        })
      } catch (err) {
        // ignore draft save errors for now
      }
    }, 500)
  }

  const handleProofStateChange = (proofId, state, meta = {}) => {
    setSavedProofStates(prev => ({
      ...prev,
      [proofId]: state
    }))
    if (meta.assignmentQuestionId) {
      scheduleDraftSave(meta.assignmentQuestionId, state)
    }
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
