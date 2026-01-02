import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WorksheetLayout from '../components/layout/WorksheetLayout.jsx'
import WorksheetTabs from '../components/problems/WorksheetTabs.jsx'
import { useScoring } from '../hooks/usescoring.js'
import { useProofState } from '../hooks/useproofstate.js'
import { exportWorksheetPDF } from '../utils/exportPDF.js'
import { API_CONFIG, fetchJson } from '../utils/api.js'

export default function Worksheet() {
  const { worksheetId, assignmentId } = useParams()
  const navigate = useNavigate()
  const [currentProofIndex, setCurrentProofIndex] = useState(0)
  const [worksheets, setWorksheets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const sessionId = useRef(null)
  const questionSessionId = useRef(null)
  
  // support both /assignment/:id and /worksheet/:id routes
  // assignmentId will be used when backend is implemented
  const id = assignmentId || worksheetId
  const worksheetIdNum = parseInt(id)

  const currentWorksheetIndex = useMemo(
    () => worksheets.findIndex((w) => w.id === worksheetIdNum),
    [worksheets, worksheetIdNum]
  )
  const currentWorksheet = worksheets[currentWorksheetIndex]
  const currentProof = currentWorksheet?.proofs[currentProofIndex]
  
  const { completedProofs, score, scoreStyle, handleProofComplete } = useScoring(currentWorksheet)
  const { getSavedProofState, handleProofStateChange } = useProofState()

  useEffect(() => {
    let keepGoing = true

    const startSession = async () => {
      if (!currentWorksheet?.id) return
      try {
        const session = await fetchJson('/api/assignment-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_id: currentWorksheet.id,
            user_id: API_CONFIG.userId,
            started_at: new Date().toISOString(),
          }),
        })
        if (keepGoing) {
          sessionId.current = session?.id ?? null
        }
      } catch (err) {
        // ignore for now
      }
    }

    const endSession = async () => {
      if (!sessionId.current) return
      try {
        await fetchJson(`/api/assignment-sessions/${sessionId.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ended_at: new Date().toISOString() }),
        })
      } catch (err) {
        // ignore for now
      } finally {
        sessionId.current = null
      }
    }

    // start a session when this assignment loads
    if (currentWorksheet?.id) {
      startSession()
    }

    // end it when leaving this assignment
    return () => {
      keepGoing = false
      endSession()
    }
  }, [currentWorksheet?.id])

  useEffect(() => {
    let keepGoing = true

    const startQuestion = async () => {
      if (!currentProof?.questionId) return
      try {
        const session = await fetchJson('/api/question-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_question_id: currentProof.questionId,
            user_id: API_CONFIG.userId,
            started_at: new Date().toISOString(),
          }),
        })
        if (keepGoing) {
          questionSessionId.current = session?.id ?? null
        }
      } catch (err) {
        // ignore for now
      }
    }

    const endQuestion = async () => {
      if (!questionSessionId.current) return
      try {
        await fetchJson(`/api/question-sessions/${questionSessionId.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ended_at: new Date().toISOString() }),
        })
      } catch (err) {
        // ignore for now
      } finally {
        questionSessionId.current = null
      }
    }

    // start session when a question becomes 'active'
    if (currentProof?.questionId) {
      startQuestion()
    }

    // end it upon any nav away from the question
    return () => {
      keepGoing = false
      endQuestion()
    }
  }, [currentProof?.questionId])

  useEffect(() => {
    let isMounted = true

    const normalizeType = (snapshot) => (
      snapshot?.type || snapshot?.problemType || snapshot?.logic_problem_type || 'derivation'
    )

    const mapQuestionToProof = (question, assignment, index) => {
      const snapshot = question?.question_snapshot || {}
      const type = normalizeType(snapshot)
      const description = snapshot.prompt || snapshot.description || snapshot.text || 'Solve.'
      const proofId = `${assignment.id}-${question.id}`
      const proofBase = {
        id: proofId,
        questionId: question.id,
        description,
      }

      if (type === 'derivation' || type === 'derivation-hurley') {
        return {
          ...proofBase,
          type: 'derivation',
          premises: snapshot.prems || snapshot.premises || [],
          conclusion: snapshot.conc || snapshot.conclusion || '',
        }
      }

      if (type === 'truth-table') {
        return {
          ...proofBase,
          type: 'truth-table',
          truthTable: snapshot.truthTable || {
            kind: snapshot.truthTable?.kind || 'formula',
            statement: snapshot.statement || snapshot.formula || '',
          },
        }
      }

      if (type === 'symbolic-translation') {
        return {
          ...proofBase,
          type: 'symbolic-translation',
          translation: snapshot.prompt || snapshot.statement || snapshot.question || '',
          answer: snapshot.answer,
        }
      }

      if (type === 'multiple-choice') {
        return {
          ...proofBase,
          type: 'multiple-choice',
          multipleChoice: snapshot.multipleChoice || {
            prompt: snapshot.prompt || '',
            choices: snapshot.choices || [],
          },
          answer: snapshot.answerIndex ?? snapshot.answer,
        }
      }

      if (type === 'true-false') {
        return {
          ...proofBase,
          type: 'true-false',
          trueFalse: snapshot.trueFalse || {
            prompt: snapshot.prompt || snapshot.statement || '',
          },
          answer: snapshot.answer,
        }
      }

      if (type === 'evaluate-truth') {
        return {
          ...proofBase,
          type: 'evaluate-truth',
          evaluateTruth: snapshot.statement || snapshot.evaluateTruth || snapshot.prompt || '',
          answer: snapshot.answer,
        }
      }

      if (type === 'valid-correct-sound') {
        return {
          ...proofBase,
          type: 'valid-correct-sound',
          premises: snapshot.prems || snapshot.premises || [],
          conclusion: snapshot.conc || snapshot.conclusion || '',
          answer: snapshot.answer,
        }
      }

      return {
        ...proofBase,
        type,
      }
    }

    const loadWorksheets = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const assignments = await fetchJson(`/api/courses/${API_CONFIG.courseId}/assignments`)
        const worksheetData = await Promise.all(
          assignments.map(async (assignment) => {
            const response = await fetchJson(
              `/api/assignments/${assignment.id}?userId=${API_CONFIG.userId}`
            )
            const questions = response.questions || []
            return {
              id: assignment.id,
              title: assignment.title,
              proofs: questions.map((question, idx) =>
                mapQuestionToProof(question, assignment, idx)
              ),
            }
          })
        )

        if (isMounted) {
          setWorksheets(worksheetData)
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load worksheets', error)
          setLoadError('Failed to load assignments.')
          setWorksheets([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadWorksheets()

    return () => {
      isMounted = false
    }
  }, [])

  const handleWorksheetChange = (newIndex) => {
    const newWorksheet = worksheets[newIndex]
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
      }

      const allStates = currentWorksheet.proofs.map((proof) => ({
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

  if (isLoading) {
    return <div>Loading assignment...</div>
  }

  if (loadError) {
    return <div>{loadError}</div>
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
      worksheets={worksheets}
      currentWorksheetIndex={currentWorksheetIndex}
      onWorksheetIndexChange={handleWorksheetChange}
      onExportClick={handleExport}
      onBackToLMS={() => navigate('/')}
    >
      <WorksheetTabs
        worksheets={worksheets}
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
