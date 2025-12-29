import { useEffect, useMemo, useState } from 'react'

export function useScoring(currentWorksheet) {
  const [completedProofs, setCompletedProofs] = useState(new Set())
  const [pop, setPop] = useState(false)

  const score = useMemo(() => {
    if (!currentWorksheet) return 0
    const worksheetProofIds = new Set(currentWorksheet.proofs.map(p => p.id))
    return Array.from(completedProofs).filter(id => worksheetProofIds.has(id)).length
  }, [completedProofs, currentWorksheet])

  useEffect(() => {
    if (score > 0) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 250)
      return () => clearTimeout(t)
    }
  }, [score])

  const scoreStyle = {
    display: 'inline-block',
    transition: 'transform 0.25s ease, filter 0.25s ease',
    transform: pop ? 'scale(1.35)' : 'scale(1)',
    filter: pop ? 'drop-shadow(0 0 6px #beafc2)' : 'none',
  }

  const handleProofComplete = (proofId) => {
    setCompletedProofs((prev) => {
      if (prev.has(proofId)) return prev
      return new Set([...prev, proofId])
    })
  }

  return {
    completedProofs,
    score,
    scoreStyle,
    handleProofComplete
  }
}
