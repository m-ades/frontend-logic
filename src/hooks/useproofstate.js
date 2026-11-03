import { useEffect, useRef, useState } from 'react'
import { fetchJson, getActiveUserId } from '../utils/api.js'

// draft saves still on their way so a fresh load of the same work can wait for them
const draftSavesInFlight = new Set()

export function draftSavesSettled() {
  return Promise.allSettled(draftSavesInFlight)
}

export function useProofState({ userId = getActiveUserId() } = {}) {
  const [savedProofStates, setSavedProofStates] = useState({})
  const saveTimersRef = useRef({})
  const pendingDraftsRef = useRef(new Map())

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
    const save = fetchJson('/api/assignment-drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_question_id: assignmentQuestionId,
        user_id: userId,
        draft_data: draftData,
      }),
    })
    draftSavesInFlight.add(save)
    const forget = () => draftSavesInFlight.delete(save)
    save.then(forget, forget)
    return save
  }

  const scheduleDraftSave = (assignmentQuestionId, draftData) => {
    if (!assignmentQuestionId) return
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

  // leaving sends waiting saves now so the next load of this work includes them
  useEffect(() => () => {
    pendingDraftsRef.current.forEach((draftData, assignmentQuestionId) => {
      saveDraftNow(assignmentQuestionId, draftData).catch(() => {})
    })
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
