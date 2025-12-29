import { useState } from 'react'

export function useProofState() {
  const [savedProofStates, setSavedProofStates] = useState({})

  const handleProofStateChange = (proofId, state) => {
    setSavedProofStates(prev => ({
      ...prev,
      [proofId]: state
    }))
  }

  const getSavedProofState = (proofId) => {
    return savedProofStates[proofId] || null
  }

  return {
    getSavedProofState,
    handleProofStateChange
  }
}
