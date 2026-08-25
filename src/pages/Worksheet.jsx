import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Box } from '@mui/material'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'
import WorksheetLayout from '../components/layout/WorksheetLayout.jsx'
import WorksheetTabs from '../components/problems/WorksheetTabs.jsx'
import { useScoring } from '../hooks/usescoring.js'
import { useProofState } from '../hooks/useproofstate.js'
import { useWorksheetMetrics } from '../hooks/useWorksheetMetrics.js'
import { formatEasternFromIso } from '../utils/easternTime.js'
// import { exportWorksheetPDF } from '../utils/exportPDF.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { displayScoreForProof } from '../utils/problemHelpers.js'
import { useCoursesState } from '../context/CoursesContext.jsx'
import { useAppRuntime } from '../hooks/useAppRuntime.js'

function SandboxWorksheetContent() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    assignmentsPath,
    isInstructor,
    sandbox,
    instructorSandbox,
  } = useAppRuntime()
  const [currentProofIndex, setCurrentProofIndex] = useState(0)

  const worksheetStore = isInstructor ? instructorSandbox : sandbox
  const assignment = isInstructor
    ? worksheetStore?.getActivity?.(assignmentId)
    : worksheetStore?.getAssignment?.(assignmentId)
  const getQuestionState = worksheetStore?.getQuestionState ?? (() => null)
  const isQuestionComplete = worksheetStore?.isQuestionComplete ?? (() => false)
  const updateQuestionState = worksheetStore?.updateQuestionState ?? (() => undefined)
  const markQuestionComplete = worksheetStore?.markQuestionComplete ?? (() => undefined)

  const worksheets = useMemo(() => (assignment ? [{ ...assignment, proofs: assignment.proofs || [] }] : []), [assignment])
  const currentWorksheet = worksheets[0]
  const total = currentWorksheet?.proofs?.length || 0
  const backTarget = location?.state?.returnTo || assignmentsPath

  const {
    completedProofs,
    score,
    handleProofComplete,
    setCompletedProofs,
  } = useScoring(currentWorksheet)

  useEffect(() => {
    if (!currentWorksheet?.proofs) return
    setCompletedProofs(new Set(
      currentWorksheet.proofs
        .filter((proof) => isQuestionComplete(proof.id))
        .map((proof) => proof.id)
    ))
  }, [currentWorksheet?.proofs, isQuestionComplete, setCompletedProofs])

  const questionScores = useMemo(() => {
    const scores = {}
    for (const proof of currentWorksheet?.proofs || []) {
      const saved = getQuestionState(proof.id)
      const rawScore = Number(saved?.rawScore)
      if (Number.isFinite(rawScore)) {
        scores[proof.questionId] = rawScore
      } else if (saved?.lastStatus === 'incorrect') {
        scores[proof.questionId] = 0
      } else if (saved?.lastStatus === 'partial') {
        scores[proof.questionId] = 50
      } else if (isQuestionComplete(proof.id)) {
        scores[proof.questionId] = 100
      }
    }
    return scores
  }, [currentWorksheet?.proofs, getQuestionState, isQuestionComplete])

  const calculatedGradePercent = useMemo(() => {
    if (!total) return null
    return (score / total) * 100
  }, [score, total])

  const { completionPercent, gradeLabel, isOverdue } = useWorksheetMetrics({
    score,
    total,
    calculatedGradePercent,
    dueAt: currentWorksheet?.dueAt || currentWorksheet?.due_at,
  })

  if (!currentWorksheet) {
    return <div>Worksheet not found</div>
  }

  return (
    <WorksheetLayout
      subtitle={currentWorksheet.title || currentWorksheet.name || "Assignment"}
      onBackToLMS={() => navigate(backTarget)}
      worksheets={worksheets}
      currentWorksheetIndex={0}
      onWorksheetIndexChange={() => {}}
      completedProofs={completedProofs}
      isOverdue={isOverdue}
      isLocked={currentWorksheet.isLocked ?? currentWorksheet.is_locked ?? false}
      showPolicyInfo
    >
      <WorksheetTabs
        worksheets={worksheets}
        currentWorksheetIndex={0}
        onWorksheetIndexChange={() => {}}
        currentProofIndex={currentProofIndex}
        onProofIndexChange={setCurrentProofIndex}
        completedProofs={completedProofs}
        questionScores={questionScores}
        onProofComplete={(proofId) => {
          handleProofComplete(proofId)
          markQuestionComplete(proofId)
        }}
        getSavedProofState={(proofId) => getQuestionState(proofId)}
        handleProofStateChange={(proofId, state) => updateQuestionState(proofId, state)}
        total={total}
        completionPercent={completionPercent}
        gradeLabel={gradeLabel}
        isInstructorView={isInstructor}
      />
    </WorksheetLayout>
  )
}

const normalizeType = (snapshot) => (
  snapshot?.type || snapshot?.problemType || snapshot?.logic_problem_type || 'derivation'
)

const mapQuestionToProof = (question, assignment, index) => {
  const snapshot = question?.question_snapshot || {}
  const type = normalizeType(snapshot)
  const description = snapshot.prompt || snapshot.description || snapshot.text || 'Solve.'
  const questionId = question?.id ?? question?.assignment_question_id ?? question?.assignmentQuestionId ?? null
  const orderIndex = question?.order_index ?? question?.orderIndex ?? index
  const proofId = `${assignment.id}-${questionId ?? index}`
  const solution = snapshot.solution
  const attemptLimit = question?.attempt_limit ?? 3
  const legend = snapshot.legend || snapshot.legend_text || snapshot.legendText || ''
  const snapshotPartial =
    snapshot.partialCredit ??
    snapshot.partialcredit ??
    snapshot.partial_credit ??
    snapshot.truthTable?.options?.partialCredit ??
    snapshot.truthTable?.options?.partialcredit ??
    snapshot.truthTable?.options?.partial_credit ??
    snapshot.truth_table?.options?.partialCredit ??
    snapshot.truth_table?.options?.partialcredit ??
    snapshot.truth_table?.options?.partial_credit ??
    snapshot.options?.partialCredit ??
    snapshot.options?.partialcredit ??
    snapshot.options?.partial_credit ??
    false
  const proofBase = {
    id: proofId,
    questionId,
    description,
    solution,
    attemptLimit,
    legend,
    partialCredit: Boolean(snapshotPartial),
    questionSnapshot: question?.question_snapshot ?? snapshot,
    orderIndex,
  }

  if (type === 'derivation' || type === 'derivation-hurley') {
    return {
      ...proofBase,
      type: 'derivation',
      premises: snapshot.prems || snapshot.premises || [],
      conclusion: snapshot.conc || snapshot.conclusion || '',
      ruleset: snapshot.ruleset || snapshot.ruleSet || {},
      options: snapshot.options || {},
    }
  }

  if (type === 'truth-table') {
    const ttOptions = snapshot.options || snapshot.truthTable?.options || snapshot.truth_table?.options || {}
    const ttSnapshot = snapshot.truthTable || snapshot.truth_table || {}
    const ttKind = ttSnapshot.kind || snapshot.truthTable?.kind || snapshot.truth_table?.kind || 'formula'
    const hasClassification = ttOptions.question === true || ttOptions.question === 'true'
    const ttPartialCredit = ttOptions.partialCredit ?? ttOptions.partialcredit ?? ttOptions.partial_credit ?? hasClassification ?? snapshotPartial
    return {
      ...proofBase,
      partialCredit: Boolean(ttPartialCredit || hasClassification),
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
      translation: {
        legend: snapshot.legend || '',
        prompt: snapshot.prompt || snapshot.statement || snapshot.question || '',
        symbolizationKey: snapshot.symbolizationKey || snapshot.symbolization_key || [],
        options: snapshot.options || {},
      },
      answer: snapshot.answer,
    }
  }

  if (type === 'multiple-choice') {
    const subquestions = snapshot.subquestions || snapshot.questions || []
    const hasSubquestions = Array.isArray(subquestions) && subquestions.length > 0
    const baseMultipleChoice = snapshot.multipleChoice || {
      prompt: snapshot.prompt || '',
      choices: snapshot.choices || [],
    }
    const normalizedMultipleChoice = {
      ...baseMultipleChoice,
      subquestions: baseMultipleChoice.subquestions || subquestions,
    }
    return {
      ...proofBase,
      type: 'multiple-choice',
      multipleChoice: normalizedMultipleChoice,
      answer: hasSubquestions ? null : (snapshot.answerIndices ?? snapshot.answerIndex ?? snapshot.answer),
    }
  }

  if (type === 'indirect-truth-table') {
    const snapshotQuestions = snapshot.questions || snapshot.subquestions || []
    const choiceList = Array.isArray(snapshot.choices) ? snapshot.choices : []
    const questions = Array.isArray(snapshotQuestions) && snapshotQuestions.length > 0
      ? snapshotQuestions
      : (choiceList.length > 0
        ? [{
            prompt: snapshot.choicePrompt || snapshot.question || '',
            choices: choiceList,
            answerIndex: snapshot.answerIndex ?? snapshot.answer ?? (Array.isArray(snapshot.answerIndices) ? snapshot.answerIndices[0] : undefined),
          }]
        : [])
    const derivedAnswer = questions.length
      ? questions.map((q) => q.answerIndex ?? q.answer ?? q.correctIndex)
      : (snapshot.answerIndex ?? snapshot.answer ?? snapshot.answerIndices)
    return {
      ...proofBase,
      type: 'indirect-truth-table',
      answer: derivedAnswer,
      indirectTruthTable: {
        prompt: snapshot.prompt || '',
        argument: snapshot.argument || {},
        questions,
        subquestions: questions,
        choices: choiceList,
        sandbox: snapshot.sandbox || {},
      },
    }
  }

  if (type === 'nonclassical-truth-table') {
    const snapshotQuestions = snapshot.questions || snapshot.subquestions || []
    const choiceList = Array.isArray(snapshot.choices) ? snapshot.choices : []
    const questions = Array.isArray(snapshotQuestions) && snapshotQuestions.length > 0
      ? snapshotQuestions
      : (choiceList.length > 0
        ? [{
            prompt: snapshot.choicePrompt || snapshot.question || '',
            choices: choiceList,
            answerIndex: snapshot.answerIndex ?? snapshot.answer ?? (Array.isArray(snapshot.answerIndices) ? snapshot.answerIndices[0] : undefined),
          }]
        : [])
    const derivedAnswer = questions.length
      ? questions.map((q) => q.answerIndex ?? q.answer ?? q.correctIndex)
      : (snapshot.answerIndex ?? snapshot.answer ?? snapshot.answerIndices)
    return {
      ...proofBase,
      type: 'nonclassical-truth-table',
      answer: derivedAnswer,
      nonclassicalTruthTable: {
        prompt: snapshot.prompt || '',
        argument: snapshot.argument || {},
        questions,
        subquestions: questions,
        choices: choiceList,
        truthValueToggle: snapshot.truthValueToggle || snapshot.truth_value_toggle || snapshot.truthValueCycle || snapshot.truth_value_cycle,
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
    const comboOptions = snapshot.options || {}
    const comboPartial = comboOptions.partialCredit ?? comboOptions.partialcredit ?? comboOptions.partial_credit ?? snapshotPartial
    return {
      ...proofBase,
      partialCredit: Boolean(comboPartial),
      description: '',
      type: 'combo-translation-truth-table',
      answer: snapshot.answer,
      options: snapshot.options,
      comboTranslationTruthTable: snapshot,
    }
  }

  if (type === 'combo-translation-derivation') {
    const comboOptions = snapshot.options || {}
    const comboPartial = comboOptions.partialCredit ?? comboOptions.partialcredit ?? comboOptions.partial_credit ?? snapshotPartial
    return {
      ...proofBase,
      partialCredit: Boolean(comboPartial),
      description: '',
      type: 'combo-translation-derivation',
      answer: snapshot.answer,
      options: snapshot.options,
      comboTranslationDerivation: snapshot,
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

const QUESTION_SESSION_TRACKING_ENABLED = false

function RealWorksheetContent() {
  const { worksheetId, assignmentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentProofIndex, setCurrentProofIndex] = useState(0)
  const [worksheets, setWorksheets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [currentDueAt, setCurrentDueAt] = useState(null)
  const [questionScores, setQuestionScores] = useState({})
  const { activeCourseId } = useCoursesState()
  const { assignmentPath, assignmentsPath, isInstructor } = useAppRuntime()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const courseIdForApi = activeCourseId ?? null
  const sessionId = useRef(null)
  const questionSessionId = useRef(null)
  const questionSessionQuestionIdRef = useRef(null)
  const desiredQuestionSessionQuestionIdRef = useRef(null)
  const questionSessionSyncRef = useRef(Promise.resolve())
  const lastActivityRef = useRef(null)
  const idleTimeoutIdRef = useRef(null)
  const scheduleIdleTimeoutRef = useRef(() => {})
  const activeUserId = getActiveUserId()
  const isMountedRef = useRef(true)
  const currentWorksheetIdRef = useRef(null)
  const solutionRefreshRef = useRef(new Set())
  
  // support both /assignment/:id and /worksheet/:id routes
  // assignmentId will be used when backend is implemented
  const id = assignmentId || worksheetId
  const worksheetIdNum = parseInt(id)

  const LAST_QUESTION_KEY = 'logic-app:last-question'
  const getLastQuestionIndex = useCallback((assignmentId) => {
    try {
      const raw = localStorage.getItem(LAST_QUESTION_KEY)
      if (!raw) return null
      const map = JSON.parse(raw)
      const n = map?.[String(assignmentId)]
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null
    } catch {
      return null
    }
  }, [])
  const setLastQuestionIndex = useCallback((assignmentId, index) => {
    try {
      const raw = localStorage.getItem(LAST_QUESTION_KEY) || '{}'
      const map = JSON.parse(raw)
      map[String(assignmentId)] = index
      localStorage.setItem(LAST_QUESTION_KEY, JSON.stringify(map))
    } catch {
      // ignore
    }
  }, [])

  const currentWorksheetIndex = useMemo(
    () => worksheets.findIndex((w) => w.id === worksheetIdNum),
    [worksheets, worksheetIdNum]
  )
  const currentWorksheet = worksheets[currentWorksheetIndex]
  const currentProof = currentWorksheet?.proofs[currentProofIndex]
  const total = currentWorksheet?.proofs.length || 0
  const worksheetDueAt = currentWorksheet?.due_at
    ?? currentWorksheet?.due_date
    ?? currentDueAt
  const defaultBackTarget = assignmentsPath
  const backTarget = location?.state?.returnTo || defaultBackTarget

  // total score: sum per-question best (0–100), same as backend
  const calculatedGradePercent = useMemo(() => {
    const proofs = currentWorksheet?.proofs ?? []
    if (proofs.length === 0) return null
    let rawSum = 0
    for (const proof of proofs) {
      const raw = questionScores[proof.questionId]
      const display = displayScoreForProof(proof, raw)
      rawSum += display != null && Number.isFinite(Number(display)) ? Number(display) : 0
    }
    const maxScore = proofs.length * 100
    return maxScore > 0 ? (rawSum / maxScore) * 100 : null
  }, [currentWorksheet?.proofs, questionScores])

  const {
    completedProofs,
    score,
    handleProofComplete,
    setCompletedProofs,
  } = useScoring(currentWorksheet)
  const { getSavedProofState, handleProofStateChange, initializeSavedProofStates } = useProofState()
  const { completionPercent, gradeLabel, isOverdue } = useWorksheetMetrics({
    score,
    total,
    calculatedGradePercent,
    dueAt: worksheetDueAt,
  })

  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  useEffect(() => {
    currentWorksheetIdRef.current = currentWorksheet?.id ?? null
  }, [currentWorksheet?.id])

  useEffect(() => {
    // reset to first problem on assignment change (restored from localStorage when worksheet loads)
    setCurrentProofIndex(0)
  }, [worksheetIdNum])

  useEffect(() => {
    // when worksheet has loaded, restore last-question index from localStorage
    const assignmentId = currentWorksheet?.id
    const proofCount = currentWorksheet?.proofs?.length
    if (assignmentId == null || !Number.isFinite(proofCount) || proofCount === 0) return
    const saved = getLastQuestionIndex(assignmentId)
    if (saved != null) {
      const clamped = Math.min(Math.max(0, saved), proofCount - 1)
      setCurrentProofIndex(clamped)
    }
  }, [currentWorksheet?.id, currentWorksheet?.proofs?.length, getLastQuestionIndex])

  useEffect(() => {
    // persist current question index so we can land on it next time
    const assignmentId = currentWorksheet?.id
    if (assignmentId == null || !Number.isFinite(currentProofIndex)) return
    setLastQuestionIndex(assignmentId, currentProofIndex)
  }, [currentWorksheet?.id, currentProofIndex, setLastQuestionIndex])

  const syncQuestionSession = useCallback(() => {
    if (!QUESTION_SESSION_TRACKING_ENABLED) {
      questionSessionId.current = null
      questionSessionQuestionIdRef.current = null
      return Promise.resolve()
    }

    questionSessionSyncRef.current = questionSessionSyncRef.current.then(async () => {
      while (true) {
        const desiredQuestionId = desiredQuestionSessionQuestionIdRef.current || null
        const activeSessionId = questionSessionId.current
        const activeQuestionId = questionSessionQuestionIdRef.current || null

        if (activeSessionId && (!desiredQuestionId || desiredQuestionId !== activeQuestionId)) {
          const closingSessionId = activeSessionId
          try {
            await fetchJson(`/api/question-sessions/${closingSessionId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ended_at: new Date().toISOString() }),
            })
          } catch (err) {
            // ignore for now
          } finally {
            if (questionSessionId.current === closingSessionId) {
              questionSessionId.current = null
              questionSessionQuestionIdRef.current = null
            }
          }
          continue
        }

        if (!activeSessionId && desiredQuestionId && activeUserId) {
          try {
            const session = await fetchJson('/api/question-sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                assignment_question_id: desiredQuestionId,
                user_id: activeUserId,
                started_at: new Date().toISOString(),
              }),
            })
            questionSessionId.current = session?.id ?? null
            questionSessionQuestionIdRef.current = questionSessionId.current ? desiredQuestionId : null
            if (questionSessionId.current) {
              scheduleIdleTimeoutRef.current()
            }
          } catch (err) {
            // ignore for now
          }
          continue
        }

        break
      }
    })

    return questionSessionSyncRef.current
  }, [activeUserId])

  useEffect(() => {
    let keepGoing = true

    const startSession = async () => {
      if (!currentWorksheet?.id || !activeUserId) return
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
      const id = sessionId.current
      try {
        await fetchJson(`/api/assignment-sessions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ended_at: new Date().toISOString() }),
        })
      } catch (err) {
        // ignore for now
      } finally {
        if (sessionId.current === id) {
          sessionId.current = null
        }
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
  }, [activeUserId, currentWorksheet?.id])

  useEffect(() => {
    let keepGoing = true

    const switchQuestionSession = async () => {
      if (!keepGoing) return
      desiredQuestionSessionQuestionIdRef.current = currentProof?.questionId || null
      await syncQuestionSession()
    }

    switchQuestionSession()

    return () => {
      keepGoing = false
      desiredQuestionSessionQuestionIdRef.current = null
      syncQuestionSession()
    }
  }, [currentProof?.questionId, syncQuestionSession])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined

    const IDLE_TIMEOUT_MS = 90_000

    const clearIdleTimeout = () => {
      if (idleTimeoutIdRef.current) {
        clearTimeout(idleTimeoutIdRef.current)
        idleTimeoutIdRef.current = null
      }
    }

    const scheduleIdleTimeout = () => {
      clearIdleTimeout()
      if (!questionSessionId.current) return
      idleTimeoutIdRef.current = setTimeout(() => {
        desiredQuestionSessionQuestionIdRef.current = null
        syncQuestionSession()
      }, IDLE_TIMEOUT_MS)
    }
    scheduleIdleTimeoutRef.current = scheduleIdleTimeout

    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      scheduleIdleTimeout()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearIdleTimeout()
        desiredQuestionSessionQuestionIdRef.current = null
        syncQuestionSession()
      } else if (document.visibilityState === 'visible') {
        desiredQuestionSessionQuestionIdRef.current = currentProof?.questionId || null
        syncQuestionSession()
      }
    }

    const handleBlur = () => {
      clearIdleTimeout()
      desiredQuestionSessionQuestionIdRef.current = null
      syncQuestionSession()
    }

    const handleFocus = () => {
      handleActivity()
      desiredQuestionSessionQuestionIdRef.current = currentProof?.questionId || null
      syncQuestionSession()
    }

    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('scroll', handleActivity)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // initialize timers when mounted
    handleActivity()

    return () => {
      clearIdleTimeout()
      scheduleIdleTimeoutRef.current = () => {}
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentProof?.questionId, syncQuestionSession])

  const refreshQuestionSolutions = useCallback(async (assignmentId, questionId) => {
    if (!assignmentId || !questionId || !activeUserId) return
    if (solutionRefreshRef.current.has(questionId)) return
    solutionRefreshRef.current.add(questionId)
    try {
      const [response, submissions] = await Promise.all([
        fetchJson(`/api/assignments/${assignmentId}?userId=${activeUserId}`),
        fetchJson(`/api/assignments/${assignmentId}/submissions?userId=${activeUserId}`).catch(() => null),
      ])
      const questions = response.questions || []
      const assignmentInfo = response.assignment || { id: assignmentId }
      const targetQuestion = questions.find((question) => (
        Number(question?.id ?? question?.assignment_question_id) === Number(questionId)
      ))
      if (!targetQuestion) {
        solutionRefreshRef.current.delete(questionId)
        return
      }
      const qIdNum = Number(questionId)
      let serverAttemptCount = null
      if (Array.isArray(submissions)) {
        serverAttemptCount = 0
        for (const s of submissions) {
          if (Number(s?.assignment_question_id) === qIdNum && Number.isFinite(s?.attempt)) {
            if (s.attempt > serverAttemptCount) serverAttemptCount = s.attempt
          }
        }
      }
      setWorksheets((prev) => (
        prev.map((worksheet) => {
          if (worksheet.id !== assignmentId) return worksheet
          const nextProofs = worksheet.proofs.map((proof, idx) => {
            if (Number(proof.questionId) !== Number(questionId)) return proof
            const updated = mapQuestionToProof(targetQuestion, assignmentInfo, idx)
            return {
              ...proof,
              ...updated,
              attemptCount: serverAttemptCount ?? proof.attemptCount ?? 0,
              attemptLimit: updated.attemptLimit ?? proof.attemptLimit,
            }
          })
          return { ...worksheet, proofs: nextProofs }
        })
      ))
    } catch (err) {
      // ignore refresh errors
    } finally {
      solutionRefreshRef.current.delete(questionId)
    }
  }, [activeUserId])

  const handleQuestionCreated = useCallback((assignmentId, createdQuestion) => {
    if (!assignmentId || !createdQuestion) return
    setWorksheets((prev) => (
      prev.map((worksheet) => {
        if (worksheet.id !== assignmentId) return worksheet
        const exists = worksheet.proofs.some(
          (proof) => Number(proof.questionId) === Number(createdQuestion.id)
        )
        if (exists) return worksheet
        const nextProof = mapQuestionToProof(createdQuestion, worksheet, worksheet.proofs.length)
        return {
          ...worksheet,
          proofs: [...worksheet.proofs, nextProof],
        }
      })
    ))
    if (currentWorksheet?.id === assignmentId) {
      const nextIndex = currentWorksheet?.proofs?.length ?? 0
      setCurrentProofIndex(nextIndex)
    }
  }, [currentWorksheet?.id, currentWorksheet?.proofs?.length, setCurrentProofIndex])

  useEffect(() => {
    setCurrentDueAt(currentWorksheet?.due_at ?? currentWorksheet?.due_date ?? null)
  }, [currentWorksheet?.id, currentWorksheet?.due_at, currentWorksheet?.due_date])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleSubmission = (event) => {
      const detail = event?.detail || {}
      const questionId = Number(detail.assignmentQuestionId ?? detail.assignment_question_id)
      const attempt = Number(detail.attempt)
      const attemptLimit = Number(detail.attemptLimit)
      const reachedLimit = Number.isFinite(attempt) && Number.isFinite(attemptLimit)
        && attempt >= attemptLimit
      const score = detail.score != null && Number.isFinite(Number(detail.score)) ? Number(detail.score) : null
      if (score != null && Number.isFinite(questionId)) {
        setQuestionScores((prev) => ({
          ...prev,
          [questionId]: Math.max(score, prev[questionId] ?? 0),
        }))
      }
      if (Number.isFinite(questionId)) {
        // sync attempts
        setWorksheets((prev) => {
          let didUpdate = false
          const next = prev.map((worksheet) => {
            let proofUpdated = false
            const nextProofs = worksheet.proofs.map((proof) => {
              if (proof.questionId !== questionId) return proof
              const attemptCount = Number.isFinite(detail.attempt)
                ? detail.attempt
                : (proof.attemptCount ?? 0) + 1
              const attemptLimit = Number.isFinite(detail.attemptLimit)
                ? detail.attemptLimit
                : proof.attemptLimit
              if (attemptCount === proof.attemptCount && attemptLimit === proof.attemptLimit) {
                return proof
              }
              proofUpdated = true
              return { ...proof, attemptCount, attemptLimit }
            })
            if (!proofUpdated) return worksheet
            didUpdate = true
            return { ...worksheet, proofs: nextProofs }
          })
          return didUpdate ? next : prev
        })
      }
      if (reachedLimit && Number.isFinite(questionId)) {
        const assignmentId = currentWorksheetIdRef.current
        if (assignmentId) {
          refreshQuestionSolutions(assignmentId, questionId)
        }
      }
      // sidebar total is local only.
    }
    window.addEventListener('assignment-submission', handleSubmission)
    return () => window.removeEventListener('assignment-submission', handleSubmission)
  }, [refreshQuestionSolutions])

  useEffect(() => {
    let isMounted = true

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
      const correctQuestionIds = new Set()
      const attemptCountMap = new Map()
      const scoreByQuestion = new Map()
      const worksheetsWithProofs = worksheetData.filter((worksheet) => worksheet.proofs.length)
      await Promise.all(
        worksheetsWithProofs.map(async (worksheet) => {
          try {
            const submissions = await fetchJson(
              `/api/assignments/${worksheet.id}/submissions?userId=${activeUserId}`
            )
            submissions.forEach((submission) => {
              const questionId = Number(submission.assignment_question_id)
              const existing = submissionMap.get(questionId)
              if (!existing || new Date(submission.submitted_at) > new Date(existing.submitted_at)) {
                submissionMap.set(questionId, submission)
              }
              if (submission.is_correct) {
                correctQuestionIds.add(questionId)
              }
              const currentAttempt = attemptCountMap.get(questionId) || 0
              if (submission.attempt > currentAttempt) {
                attemptCountMap.set(questionId, submission.attempt)
              }
              const s = Number(submission.score)
              if (Number.isFinite(s)) {
                scoreByQuestion.set(questionId, Math.max(s, scoreByQuestion.get(questionId) ?? 0))
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

        if (proof.type === 'combo-translation-derivation') {
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
          const initial = { argumentLine }
          if (data?.derivationState) {
            initial.derivationState = data.derivationState
          } else if (data?.proof) {
            initial.derivationState = { ans: data.proof }
          } else if (data?.ans) {
            initial.derivationState = data.ans
          }
          initialStates[proof.id] = initial
          return
        }

        if (proof.type === 'indirect-truth-table') {
          if (data && typeof data === 'object') {
            initialStates[proof.id] = {
              ans: data.ans ?? data.answer ?? (Array.isArray(data.answers) ? data.answers[0] : ''),
              answers: Array.isArray(data.answers) ? data.answers : undefined,
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
      const completedProofIds = new Set()
      questionIds.forEach((questionId) => {
        if (!correctQuestionIds.has(questionId)) return
        const proof = proofMeta[questionId]
        if (!proof) return
        completedProofIds.add(proof.id)
      })
      return { attemptCountMap, completedProofIds, scoreByQuestion }
    }

    const loadWorksheetDetails = async (assignmentId, assignmentMeta) => {
    const response = await fetchJson(
      `/api/assignments/${assignmentId}?userId=${activeUserId}`
    )
    const questions = response.questions || []
    const policy = response.policy || null
    const assignmentInfo = response.assignment
      || assignmentMeta
      || { id: assignmentId, title: 'Assignment' }
    const originalDueAt = assignmentInfo.due_at ?? assignmentInfo.due_date ?? null
    const effectiveDueAt = policy?.due_at ?? originalDueAt
    const worksheet = {
      id: assignmentInfo.id,
      title: assignmentInfo.title,
      due_at: effectiveDueAt,
      original_due_at: originalDueAt,
      policy,
      isLocked: assignmentInfo.is_locked ?? false,
      hasLoadedDetails: true,
      proofs: questions.map((question, idx) =>
        mapQuestionToProof(question, assignmentInfo, idx)
      ),
    }
      const { attemptCountMap, completedProofIds, scoreByQuestion } = await loadSavedStates([worksheet])
      setCompletedProofs(completedProofIds)
      if (scoreByQuestion?.size) {
        setQuestionScores((prev) => ({
          ...prev,
          ...Object.fromEntries(scoreByQuestion),
        }))
      }
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
        if (!courseIdForApi) return
        const targetAssignmentId = Number.isFinite(worksheetIdNum) ? worksheetIdNum : null

        if (worksheets.length && targetAssignmentId) {
          const existingIndex = worksheets.findIndex((worksheet) => worksheet.id === targetAssignmentId)
          if (existingIndex !== -1) {
            const existing = worksheets[existingIndex]
            if (existing.hasLoadedDetails || existing.proofs.length) {
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
        const assignments = await fetchJson(`/api/courses/${courseIdForApi}/assignments`)
        const orderedAssignments = sortAssignmentsBySubchapter(assignments || [])
        const fallbackAssignmentId = targetAssignmentId || orderedAssignments?.[0]?.id
        if (!fallbackAssignmentId) {
          if (isMounted) {
            setWorksheets([])
            setIsLoading(false)
          }
          return
        }
        const assignmentMeta = orderedAssignments.find((assignment) => assignment.id === fallbackAssignmentId)
        const loadedWorksheet = await loadWorksheetDetails(fallbackAssignmentId, assignmentMeta)
        const worksheetData = orderedAssignments?.length
          ? orderedAssignments.map((assignment) => (
            assignment.id === fallbackAssignmentId
              ? loadedWorksheet
              : { id: assignment.id, title: assignment.title, proofs: [], hasLoadedDetails: false }
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
      navigate(assignmentPath(newWorksheet.id), {
        state: { returnTo: backTarget }
      })
    }
  }

  // Temporarily disabled export PDF feature
  // const handleExport = async () => {
  //   if (!currentWorksheet) return
  //   if (!window.confirm('Download your answers as PDF?')) return
  //   
  //   try {
  //     let liveState = null
  //     try {
  //       const derivEl = document.querySelector('derivation-hurley')
  //       if (derivEl?.getState && !derivEl._isRestoring) {
  //         liveState = derivEl.getState()
  //       }
  //     } catch (err) {
  //     }

  //     const allStates = currentWorksheet.proofs.map((proof) => ({
  //       id: proof.id,
  //       questionId: proof.questionId,
  //       premises: proof.premises,
  //       conclusion: proof.conclusion,
  //       savedState: proof.id === currentProof?.id && liveState
  //         ? liveState
  //         : getSavedProofState(proof.id)
  //     }))
  //     
  //     await exportWorksheetPDF({
  //       worksheet: currentWorksheet.title,
  //       worksheetId: currentWorksheet.id,
  //       exportedAt: new Date().toISOString(),
  //       proofs: allStates
  //     })
  //   } catch (error) {
  //     alert(`Export failed: ${error?.message || 'Unknown error'}`)
  //   }
  // }

  const policySummary = useMemo(() => {
    if (!currentWorksheet?.policy) return []
    const policy = currentWorksheet.policy
    const lines = []
    const extensionLabel = policy?.extension_due_at
      ? formatEasternFromIso(policy.extension_due_at, { includeTime: true })
      : null
    const accommodationLabel = policy?.accommodation_due_at
      ? formatEasternFromIso(policy.accommodation_due_at, { includeTime: true })
      : null
    if (extensionLabel) lines.push({ label: 'Extension', value: extensionLabel })
    if (accommodationLabel) lines.push({ label: 'Accommodation', value: accommodationLabel })
    if (policy.late_penalty_waived) {
      lines.push({ label: 'Late penalty waived', value: null })
    }
    return lines
  }, [currentWorksheet?.policy, currentWorksheet?.due_at, currentWorksheet?.original_due_at])

  if (isLoading) {
    return <LoadingSpinner label="Loading assignment..." />
  }

  if (loadError) {
    return <div>{loadError}</div>
  }

  if (!currentWorksheet) {
    return <div>Worksheet not found</div>
  }

  return (
    <Box
      sx={{
        // keep the old baseline and let root scaling work
        '& .logicpenguin': { fontSize: '1.25rem' },
      }}
    >
      <WorksheetLayout
        subtitle={currentWorksheet.title || "Predicate Logic: Natural Deduction"}
        onBackToLMS={() => navigate(backTarget)}
        worksheets={worksheets}
        currentWorksheetIndex={currentWorksheetIndex}
        onWorksheetIndexChange={handleWorksheetChange}
        completedProofs={completedProofs}
        isOverdue={isOverdue}
        isLocked={currentWorksheet.isLocked ?? false}
        showPolicyInfo={false}
      >
        <WorksheetTabs
          key={`worksheet-${currentWorksheet?.id ?? worksheetIdNum}`}
          worksheets={worksheets}
          currentWorksheetIndex={currentWorksheetIndex}
          onWorksheetIndexChange={handleWorksheetChange}
          currentProofIndex={currentProofIndex}
          onProofIndexChange={setCurrentProofIndex}
          completedProofs={completedProofs}
          questionScores={questionScores}
          onProofComplete={handleProofComplete}
          getSavedProofState={getSavedProofState}
          handleProofStateChange={handleProofStateChange}
          total={total}
          completionPercent={completionPercent}
          gradeLabel={gradeLabel}
          policySummary={policySummary}
          isOverdue={isOverdue}
          isInstructorView={isInstructor}
          onQuestionSaved={currentWorksheet?.id ? (qId) => refreshQuestionSolutions(currentWorksheet.id, qId) : undefined}
          onQuestionCreated={handleQuestionCreated}
        />
      </WorksheetLayout>
    </Box>
  )
}

export default function Worksheet() {
  const runtime = useAppRuntime()
  return runtime.isSandbox ? <SandboxWorksheetContent /> : <RealWorksheetContent />
}
