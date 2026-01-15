import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WorksheetLayout from '../components/layout/WorksheetLayout.jsx'
import WorksheetTabs from '../components/problems/WorksheetTabs.jsx'
import { useScoring } from '../hooks/usescoring.js'
import { useProofState } from '../hooks/useproofstate.js'
import { exportWorksheetPDF } from '../utils/exportPDF.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { useCoursesState } from '../context/CoursesContext.jsx'

export default function Worksheet() {
  const { worksheetId, assignmentId } = useParams()
  const navigate = useNavigate()
  const [currentProofIndex, setCurrentProofIndex] = useState(0)
  const [worksheets, setWorksheets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const { activeCourseId } = useCoursesState()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const sessionId = useRef(null)
  const questionSessionId = useRef(null)
  const activeUserId = getActiveUserId()
  
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
  const { getSavedProofState, handleProofStateChange, initializeSavedProofStates } = useProofState()

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
            user_id: activeUserId,
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
            user_id: activeUserId,
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
      const solution = snapshot.solution
      const attemptLimit = question?.attempt_limit ?? 3
      const proofBase = {
        id: proofId,
        questionId: question.id,
        description,
        solution,
        attemptLimit,
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
        const ttOptions = snapshot.options || snapshot.truthTable?.options || {}
        const ttSnapshot = snapshot.truthTable || {}
        const ttKind = ttSnapshot.kind || snapshot.truthTable?.kind || 'formula'
        return {
          ...proofBase,
          type: 'truth-table',
          options: ttOptions,
          truthTable: {
            ...ttSnapshot,
            kind: ttKind,
            statement: ttSnapshot.statement ?? snapshot.statement ?? snapshot.formula ?? '',
            options: ttOptions,
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
          answer: snapshot.answerIndices ?? snapshot.answerIndex ?? snapshot.answer,
        }
      }

      if (type === 'indirect-truth-table') {
        return {
          ...proofBase,
          type: 'indirect-truth-table',
          answer: snapshot.answerIndex ?? snapshot.answer,
          indirectTruthTable: {
            prompt: snapshot.prompt || '',
            argument: snapshot.argument || {},
            choices: snapshot.choices || ['Valid', 'Invalid'],
            sandbox: snapshot.sandbox || {},
          },
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

      /*
      if (type === 'valid-correct-sound') {
        return {
          ...proofBase,
          type: 'valid-correct-sound',
          premises: snapshot.prems || snapshot.premises || [],
          conclusion: snapshot.conc || snapshot.conclusion || '',
          answer: snapshot.answer,
        }
      }
      */

      if (type === 'single-row-truth-table') {
        return {
          ...proofBase,
          type: 'single-row-truth-table',
          singleRowTruthTable: {
            statement: snapshot.statement || snapshot.evaluateTruth || snapshot.prompt || '',
            interpretation: snapshot.interpretation || {},
            prompt: snapshot.prompt || snapshot.description || '',
          },
        }
      }

      if (type === 'partial-truth-table') {
        return {
          ...proofBase,
          type: 'partial-truth-table',
          partialTruthTable: snapshot,
        }
      }

      if (type === 'combo-translation-truth-table') {
        return {
          ...proofBase,
          description: '',
          type: 'combo-translation-truth-table',
          answer: snapshot.answer,
          options: snapshot.options,
          comboTranslationTruthTable: snapshot,
        }
      }

      return {
        ...proofBase,
        type,
      }
    }

    const toSymbol = (value) => (value === true ? 'T' : value === false ? 'F' : '')
    const buildTruthTableState = (lefts, right, data) => {
      const mapRows = (rows = []) => rows.map((row) => row.map(toSymbol))
      const state = ({
        tables: [
          ...lefts.map((table) => ({ rows: mapRows(table.rows) })),
          { rows: mapRows(right.rows) }
        ]
      })
      if (Array.isArray(data?.mcans)) {
        state.mcans = data.mcans
      }
      if (data?.taut !== undefined) {
        state.taut = data.taut
      }
      if (data?.contra !== undefined) {
        state.contra = data.contra
      }
      if (data?.valid !== undefined) {
        state.valid = data.valid
      }
      if (data?.equiv !== undefined) {
        state.equiv = data.equiv
      }
      return state
    }

    const loadSavedStates = async (worksheetData) => {
      const questionIds = new Set()
      const proofMeta = {}

      worksheetData.forEach((worksheet) => {
        worksheet.proofs.forEach((proof) => {
          if (proof.questionId) {
            questionIds.add(proof.questionId)
            proofMeta[proof.questionId] = proof
          }
        })
      })

      const draftMap = new Map()
      try {
        const drafts = await fetchJson('/api/assignment-drafts')
        drafts.forEach((draft) => {
          if (draft.user_id !== activeUserId) return
          if (!questionIds.has(draft.assignment_question_id)) return
          draftMap.set(draft.assignment_question_id, draft.draft_data)
        })
      } catch (err) {
        // ignore draft load errors for now
      }

      const submissionMap = new Map()
      const attemptCountMap = new Map()
      const worksheetsWithProofs = worksheetData.filter((worksheet) => worksheet.proofs.length)
      await Promise.all(
        worksheetsWithProofs.map(async (worksheet) => {
          try {
            const submissions = await fetchJson(
              `/api/assignments/${worksheet.id}/submissions?userId=${activeUserId}`
            )
            submissions.forEach((submission) => {
              const existing = submissionMap.get(submission.assignment_question_id)
              if (!existing || new Date(submission.submitted_at) > new Date(existing.submitted_at)) {
                submissionMap.set(submission.assignment_question_id, submission)
              }
              const currentAttempt = attemptCountMap.get(submission.assignment_question_id) || 0
              if (submission.attempt > currentAttempt) {
                attemptCountMap.set(submission.assignment_question_id, submission.attempt)
              }
            })
          } catch (err) {
            // ignore submission load errors for now
          }
        })
      )

      const initialStates = {}
      questionIds.forEach((questionId) => {
        const proof = proofMeta[questionId]
        if (!proof) return
        if (draftMap.has(questionId)) {
          initialStates[proof.id] = draftMap.get(questionId)
          return
        }

        const submission = submissionMap.get(questionId)
        if (!submission?.submission_data) return
        const data = submission.submission_data

        if (proof.type === 'truth-table') {
          const truthTable = proof.truthTable || {}
          const kind = truthTable.kind || 'formula'
          if (kind === 'formula' && data.right) {
            initialStates[proof.id] = buildTruthTableState([], data.right, data)
          } else if (kind === 'equivalence' && data.lefts?.length && data.right) {
            initialStates[proof.id] = buildTruthTableState(data.lefts, data.right, data)
          } else if (kind === 'argument' && data.lefts?.length && data.right) {
            initialStates[proof.id] = buildTruthTableState(data.lefts, data.right, data)
          }
          return
        }

        if (proof.type === 'single-row-truth-table') {
          if (Array.isArray(data.row)) {
            initialStates[proof.id] = {
              row: data.row.map(toSymbol),
            }
          }
          return
        }

        if (proof.type === 'partial-truth-table') {
          if (Array.isArray(data.row)) {
            initialStates[proof.id] = {
              row: data.row.map(toSymbol),
            }
          }
          return
        }

        if (proof.type === 'combo-translation-truth-table') {
          const translations = Array.isArray(data?.translations) ? data.translations : []
          const chosenConclusion = data?.chosenConclusion ?? null
          let argumentLine = data?.argumentLine ?? data?.argument ?? ''
          if (!argumentLine && translations.length > 0 && chosenConclusion !== null) {
            const premiseTranslations = translations.filter((_, idx) => idx !== chosenConclusion)
            const conclusionTranslation = translations[chosenConclusion] ?? ''
            if (premiseTranslations.length && conclusionTranslation) {
              argumentLine = `${premiseTranslations.join(' / ')} // ${conclusionTranslation}`
            }
          }
          const initial = {
            argumentLine,
          }
          if (data?.tableAns?.lefts && data?.tableAns?.right) {
            initial.tableState = buildTruthTableState(
              data.tableAns.lefts,
              data.tableAns.right,
              data.tableAns
            )
          }
          initialStates[proof.id] = initial
          return
        }

        if (proof.type === 'indirect-truth-table') {
          if (data && typeof data === 'object') {
            initialStates[proof.id] = {
              ans: data.ans ?? data.answer ?? '',
              sandboxRow: Array.isArray(data.sandboxRow) ? data.sandboxRow : [],
              sandboxRows: Array.isArray(data.sandboxRows) ? data.sandboxRows : [],
            }
          } else {
            initialStates[proof.id] = { ans: data }
          }
          return
        }

        if (proof.type === 'valid-correct-sound') {
          initialStates[proof.id] = { ans: data }
          return
        }

        if (proof.type === 'derivation' || proof.type === 'derivation-hurley') {
          initialStates[proof.id] = data.ans || data.ind ? data : { ans: data }
          return
        }

        initialStates[proof.id] = { ans: data }
      })

      initializeSavedProofStates(initialStates)
      return attemptCountMap
    }

    const loadWorksheetDetails = async (assignmentId, assignmentMeta) => {
      const response = await fetchJson(
        `/api/assignments/${assignmentId}?userId=${activeUserId}`
      )
      const questions = response.questions || []
      const assignmentInfo = response.assignment
        || assignmentMeta
        || { id: assignmentId, title: 'Assignment' }
      const worksheet = {
        id: assignmentInfo.id,
        title: assignmentInfo.title,
        proofs: questions.map((question, idx) =>
          mapQuestionToProof(question, assignmentInfo, idx)
        ),
      }
      const attemptCountMap = await loadSavedStates([worksheet])
      return {
        ...worksheet,
        proofs: worksheet.proofs.map((proof) => ({
          ...proof,
          attemptCount: attemptCountMap?.get(proof.questionId) ?? 0,
        })),
      }
    }

    const loadWorksheets = async () => {
      setLoadError('')
      try {
        if (!courseId) return
        const targetAssignmentId = Number.isFinite(worksheetIdNum) ? worksheetIdNum : null

        if (worksheets.length && targetAssignmentId) {
          const existingIndex = worksheets.findIndex((worksheet) => worksheet.id === targetAssignmentId)
          if (existingIndex !== -1) {
            const existing = worksheets[existingIndex]
            if (existing.proofs.length) {
              if (isMounted) {
                setIsLoading(false)
              }
              return
            }
            setIsLoading(true)
            const loaded = await loadWorksheetDetails(targetAssignmentId, existing)
            if (isMounted) {
              setWorksheets((prev) => prev.map((worksheet, idx) => (
                idx === existingIndex ? loaded : worksheet
              )))
              setIsLoading(false)
            }
            return
          }
        }

        setIsLoading(true)
        const assignments = await fetchJson(`/api/courses/${courseId}/assignments`)
        const fallbackAssignmentId = targetAssignmentId || assignments?.[0]?.id
        if (!fallbackAssignmentId) {
          if (isMounted) {
            setWorksheets([])
            setIsLoading(false)
          }
          return
        }
        const assignmentMeta = assignments.find((assignment) => assignment.id === fallbackAssignmentId)
        const loadedWorksheet = await loadWorksheetDetails(fallbackAssignmentId, assignmentMeta)
        const worksheetData = assignments?.length
          ? assignments.map((assignment) => (
            assignment.id === fallbackAssignmentId
              ? loadedWorksheet
              : { id: assignment.id, title: assignment.title, proofs: [] }
          ))
          : [loadedWorksheet]

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
  }, [activeUserId, courseId, worksheetIdNum, worksheets])

  const handleWorksheetChange = (newIndex) => {
    const newWorksheet = worksheets[newIndex]
    if (newWorksheet) {
      navigate(`/student/assignment/${newWorksheet.id}`)
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
