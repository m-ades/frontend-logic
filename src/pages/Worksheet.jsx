import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WorksheetLayout from '../components/layout/WorksheetLayout.jsx'
import WorksheetTabs from '../components/problems/WorksheetTabs.jsx'
import { WORKSHEETS } from '../placeholder/proofs.js'
import { useScoring } from '../hooks/usescoring.js'
import { useProofState } from '../hooks/useproofstate.js'
import { exportWorksheetPDF } from '../utils/exportPDF.js'

export default function Worksheet() {
  const { worksheetId, assignmentId } = useParams()
  const navigate = useNavigate()
  const [currentProofIndex, setCurrentProofIndex] = useState(0)
  
  // support both /assignment/:id and /worksheet/:id routes
  // assignmentId will be used when backend is implemented
  const id = assignmentId || worksheetId
  const worksheetIdNum = parseInt(id)
  const currentWorksheetIndex = WORKSHEETS.findIndex(w => w.id === worksheetIdNum)
  const currentWorksheet = WORKSHEETS[currentWorksheetIndex]
  const currentProof = currentWorksheet?.proofs[currentProofIndex]
  
  const { completedProofs, score, scoreStyle, handleProofComplete } = useScoring(currentWorksheet)
  const { getSavedProofState, handleProofStateChange } = useProofState()

  const handleWorksheetChange = (newIndex) => {
    const newWorksheet = WORKSHEETS[newIndex]
    if (newWorksheet) {
      // use assignment route if we came from assignment route, otherwise worksheet route
      if (assignmentId) {
        navigate(`/assignment/${newWorksheet.id}`)
      } else {
        navigate(`/worksheet/${newWorksheet.id}`)
      }
    }
  }

  const handleExport = async () => {
    if (!currentWorksheet) return
    if (!window.confirm('Download your answers as PDF?')) return
    
    try {
      let liveState = null
      try {
        const derivEl = document.querySelector('derivation-hurley')
        if (derivEl?.getState && !derivEl._isRestoring) {
          liveState = derivEl.getState()
        }
      } catch (err) {
        // silently fail - use saved state instead
      }

      const allStates = currentWorksheet.proofs.map(proof => ({
        id: proof.id,
        questionId: proof.questionId,
        premises: proof.premises,
        conclusion: proof.conclusion,
        savedState: proof.id === currentProof?.id && liveState
          ? liveState
          : getSavedProofState(proof.id)
      }))
      
      await exportWorksheetPDF({
        worksheet: currentWorksheet.title,
        worksheetId: currentWorksheet.id,
        exportedAt: new Date().toISOString(),
        proofs: allStates
      })
    } catch (error) {
      alert(`Export failed: ${error?.message || 'Unknown error'}`)
    }
  }

  if (!currentWorksheet) {
    return <div>Worksheet not found</div>
  }

  return (
    <WorksheetLayout
      title="PHILO 275"
      subtitle={currentWorksheet.title || "Predicate Logic: Natural Deduction"}
      score={score}
      total={currentWorksheet.proofs.length || 0}
      scoreStyle={scoreStyle}
      currentProofId={currentProof?.id}
      completedProofs={completedProofs}
      worksheets={WORKSHEETS}
      currentWorksheetIndex={currentWorksheetIndex}
      onWorksheetIndexChange={handleWorksheetChange}
      onExportClick={handleExport}
      onBackToLMS={() => navigate('/')}
    >
      <WorksheetTabs
        worksheets={WORKSHEETS}
        currentWorksheetIndex={currentWorksheetIndex}
        onWorksheetIndexChange={handleWorksheetChange}
        currentProofIndex={currentProofIndex}
        onProofIndexChange={setCurrentProofIndex}
        completedProofs={completedProofs}
        onProofComplete={handleProofComplete}
        getSavedProofState={getSavedProofState}
        handleProofStateChange={handleProofStateChange}
      />
    </WorksheetLayout>
  )
}
