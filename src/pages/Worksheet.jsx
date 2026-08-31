import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
import { DEFAULT_LOGIC_SYSTEM, isDerivationProblemType, normalizeLogicSystem } from '../lib/logicSystems.js'
import { mapQuestionToProof, logicSystemForQuestionType } from '../lib/mapQuestionToProof.js'
import WorksheetTextbookSplit from '../components/textbook/WorksheetTextbookSplit.jsx'

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
      />
    </WorksheetLayout>
  )
}

function clampIndex(index, length) {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)))
}

/*
purpose keeps worksheet data and question selection consistent
contract worksheet updates preserve the selected proof when it still exists
invariant the selected index is valid for the active worksheet after data changes
error behavior a missing selected proof falls back to the nearest valid index
*/
function worksheetViewReducer(state, action) {
  if (action.type === 'set-proof-index') {
    const nextIndex = typeof action.update === 'function'
      ? action.update(state.currentProofIndex)
      : action.update
    return nextIndex === state.currentProofIndex
      ? state
      : { ...state, currentProofIndex: nextIndex }
  }

  if (action.type === 'set-worksheets') {
    const nextWorksheets = typeof action.update === 'function'
      ? action.update(state.worksheets)
      : action.update
    if (nextWorksheets === state.worksheets) return state

    const activeWorksheetId = action.activeWorksheetId
    const previousWorksheet = state.worksheets.find(
      (worksheet) => Number(worksheet.id) === Number(activeWorksheetId)
    )
    const selectedProofId = previousWorksheet?.proofs?.[state.currentProofIndex]?.id
    const nextWorksheet = nextWorksheets.find(
      (worksheet) => Number(worksheet.id) === Number(activeWorksheetId)
    )
    const selectedIndex = selectedProofId == null
      ? -1
      : nextWorksheet?.proofs?.findIndex((proof) => proof.id === selectedProofId) ?? -1
    const currentProofIndex = selectedIndex >= 0
      ? selectedIndex
      : clampIndex(state.currentProofIndex, nextWorksheet?.proofs?.length ?? 0)

    return { worksheets: nextWorksheets, currentProofIndex }
  }

  return state
}

const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1 || value === '1') return 'T'
  if (value === false || value === 'F' || value === 'f' || value === 0 || value === '0') return 'F'
  if (value === 'U' || value === 'u' || value === '?') return 'U'
  return ''
}
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
  const currentWorksheetIdRef = useRef(null)
  const restoredQuestionIndexForAssignmentRef = useRef(null)
  const [{ currentProofIndex, worksheets }, dispatchWorksheetView] = useReducer(
    worksheetViewReducer,
    { currentProofIndex: 0, worksheets: [] }
  )
  const setCurrentProofIndex = useCallback((update) => {
    dispatchWorksheetView({ type: 'set-proof-index', update })
  }, [])
  const setWorksheets = useCallback((update) => {
    dispatchWorksheetView({
      type: 'set-worksheets',
      update,
      activeWorksheetId: currentWorksheetIdRef.current,
    })
  }, [])
  const worksheetsRef = useRef(worksheets)
  worksheetsRef.current = worksheets
  const [isLoading, setIsLoading] = useState(true)
  const [settledRequestKey, setSettledRequestKey] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [currentDueAt, setCurrentDueAt] = useState(null)
  const [questionScores, setQuestionScores] = useState({})
  const { activeCourseId, courses } = useCoursesState()
  const { assignmentPath, assignmentsPath, isInstructor } = useAppRuntime()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const courseIdForApi = activeCourseId ?? null
  const activeCourse = useMemo(
    () => courses.find((course) => Number(course.id) === Number(activeCourseId)),
    [courses, activeCourseId]
  )
  const courseLogicSystem = normalizeLogicSystem(
    activeCourse?.logicSystem ?? activeCourse?.logic_system,
    DEFAULT_LOGIC_SYSTEM
  )
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
  const solutionRefreshRef = useRef(new Set())
  
  // support both /assignment/:id and /worksheet/:id routes
  // assignmentId will be used when backend is implemented
  const id = assignmentId || worksheetId
  const worksheetIdNum = parseInt(id)
  const worksheetRequestKey = courseIdForApi ? `${courseIdForApi}:${id ?? ''}` : null

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
  currentWorksheetIdRef.current = currentWorksheet?.id ?? null
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
    // course data can arrive after proofs are mapped
    setWorksheets((prev) => {
      let didChange = false
      const next = prev.map((worksheet) => {
        let worksheetChanged = false
        const proofs = worksheet.proofs || []
        const nextProofs = proofs.map((proof) => {
          const proofLogicSystem = logicSystemForQuestionType(proof.type, courseLogicSystem)
          if (proof.logicSystem === proofLogicSystem) return proof
          worksheetChanged = true
          return { ...proof, logicSystem: proofLogicSystem }
        })
        if (!worksheetChanged) return worksheet
        didChange = true
        return { ...worksheet, proofs: nextProofs }
      })
      return didChange ? next : prev
    })
  }, [courseLogicSystem])

  useEffect(() => {
    // reset to first problem on assignment change (restored from localStorage when worksheet loads)
    restoredQuestionIndexForAssignmentRef.current = null
    setCurrentProofIndex(0)
  }, [worksheetIdNum])

  useEffect(() => {
    // when worksheet has loaded, restore last-question index from localStorage
    const assignmentId = currentWorksheet?.id
    const proofCount = currentWorksheet?.proofs?.length
    if (assignmentId == null || !Number.isFinite(proofCount) || proofCount === 0) return
    if (Number(restoredQuestionIndexForAssignmentRef.current) === Number(assignmentId)) return
    restoredQuestionIndexForAssignmentRef.current = assignmentId
    const saved = getLastQuestionIndex(assignmentId)
    if (saved != null) {
      const clamped = clampIndex(saved, proofCount)
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
        setWorksheets((previous) => previous.map((worksheet) => {
          if (Number(worksheet.id) !== Number(assignmentId)) return worksheet
          const proofs = worksheet.proofs.filter(
            (proof) => Number(proof.questionId) !== Number(questionId)
          )
          return proofs.length === worksheet.proofs.length
            ? worksheet
            : { ...worksheet, proofs }
        }))
        setQuestionScores((previous) => {
          const next = { ...previous }
          delete next[questionId]
          return next
        })
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
      setWorksheets((previous) => previous.map((worksheet) => {
        if (Number(worksheet.id) !== Number(assignmentId)) return worksheet
        const proofs = worksheet.proofs.map((proof, idx) => {
          if (Number(proof.questionId) !== Number(questionId)) return proof
          const updated = mapQuestionToProof(targetQuestion, assignmentInfo, idx, courseLogicSystem)
          return {
            ...proof,
            ...updated,
            attemptCount: serverAttemptCount ?? proof.attemptCount ?? 0,
            attemptLimit: updated.attemptLimit ?? proof.attemptLimit,
          }
        })
        return { ...worksheet, proofs }
      }))
    } catch (err) {
      // ignore refresh errors
    } finally {
      solutionRefreshRef.current.delete(questionId)
    }
  }, [activeUserId, courseLogicSystem])

  const handleQuestionCreated = useCallback((assignmentId, createdQuestion) => {
    if (!assignmentId || !createdQuestion) return
    setWorksheets((previous) => previous.map((worksheet) => {
      if (Number(worksheet.id) !== Number(assignmentId)) return worksheet
      const exists = worksheet.proofs.some((proof) => Number(proof.questionId) === Number(createdQuestion.id))
      if (exists) return worksheet
      const nextProof = mapQuestionToProof(createdQuestion, worksheet, worksheet.proofs.length, courseLogicSystem)
      return { ...worksheet, proofs: [...worksheet.proofs, nextProof] }
    }))
    if (Number(currentWorksheetIdRef.current) === Number(assignmentId)) {
      const worksheet = worksheetsRef.current.find(
        (item) => Number(item.id) === Number(assignmentId)
      )
      const nextIndex = worksheet?.proofs?.length ?? 0
      setCurrentProofIndex(nextIndex)
    }
  }, [courseLogicSystem, setCurrentProofIndex])

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
              compound: toSymbol(data.compound),
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

        if (proof.type === 'proof-argument-extraction') {
          initialStates[proof.id] = {
            argumentLine: data?.argumentLine ?? data?.argument ?? '',
            derivationState: data?.derivationState
              ?? (data?.proof ? { ans: data.proof } : null),
          }
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

        if (isDerivationProblemType(proof.type)) {
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
      groupQuestionsByType: assignmentInfo.group_questions_by_type ?? false,
      hasLoadedDetails: true,
      proofs: questions.map((question, idx) =>
        mapQuestionToProof(question, assignmentInfo, idx, courseLogicSystem)
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
      setIsLoading(true)
      try {
        if (!courseIdForApi) return
        const targetAssignmentId = Number.isFinite(worksheetIdNum) ? worksheetIdNum : null
        const currentWorksheets = worksheetsRef.current

        if (currentWorksheets.length && targetAssignmentId) {
          const existingIndex = currentWorksheets.findIndex((worksheet) => worksheet.id === targetAssignmentId)
          if (existingIndex !== -1) {
            const existing = currentWorksheets[existingIndex]
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
          const notAvailable = error?.status === 403 || error?.status === 404
          setLoadError(notAvailable
            ? 'This assignment is not available.'
            : 'Failed to load assignments.')
          setWorksheets([])
        }
      } finally {
        if (isMounted) {
          setSettledRequestKey(worksheetRequestKey)
          setIsLoading(false)
        }
      }
    }

    loadWorksheets()

    return () => {
      isMounted = false
    }
  }, [activeUserId, courseId, courseLogicSystem, worksheetIdNum, worksheetRequestKey])

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

  // terminal states belong only to the course and worksheet request that produced them
  if (!worksheetRequestKey || isLoading || settledRequestKey !== worksheetRequestKey) {
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
      <WorksheetTextbookSplit
        practiceId={currentWorksheet.id}
        activityKind={currentWorksheet.kind}
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
            logicSystem={courseLogicSystem}
          />
        </WorksheetLayout>
      </WorksheetTextbookSplit>
    </Box>
  )
}

export default function Worksheet() {
  const runtime = useAppRuntime()
  return runtime.isSandbox ? <SandboxWorksheetContent /> : <RealWorksheetContent />
}
