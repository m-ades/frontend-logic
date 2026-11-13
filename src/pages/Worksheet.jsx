import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Box } from '@mui/material'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'
import WorksheetLayout from '../components/layout/WorksheetLayout.jsx'
import WorksheetTabs from '../components/problems/WorksheetTabs.jsx'
import { useScoring } from '../hooks/usescoring.js'
import { useProofState } from '../hooks/useproofstate.js'
import { useWorksheetMetrics } from '../hooks/useWorksheetMetrics.js'
import { formatEasternFromIso } from '../utils/easternTime.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { displayScoreForProof } from '../utils/problemHelpers.js'
import { useCoursesState } from '../context/CoursesContext.jsx'
import { worksheetQuery } from '../hooks/useWarmWorksheets.js'
import { useAppRuntime } from '../hooks/useAppRuntime.js'
import { hasStaffAccess } from '../utils/auth.js'
import { ASSIGNMENT_SUBMISSION_EVENT } from '../utils/submissionRuntime.js'
import { DEFAULT_LOGIC_SYSTEM, isDerivationProblemType, normalizeLogicSystem } from '../lib/logicSystems.js'
import { mapQuestionToProof, logicSystemForQuestionType } from '../lib/mapQuestionToProof.js'
import WorksheetTextbookSplit from '../components/textbook/WorksheetTextbookSplit.jsx'
import { useAssignmentSession } from '../hooks/useAssignmentSession.js'

function SandboxWorksheetContent() {
  const { assignmentId } = useParams()
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

  const currentWorksheet = useMemo(() => (assignment ? { ...assignment, proofs: assignment.proofs || [] } : null), [assignment])
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
      backTo={backTarget}
      completedProofs={completedProofs}
      isOverdue={isOverdue}
      isLocked={currentWorksheet.isLocked ?? currentWorksheet.is_locked ?? false}
      showPolicyInfo
    >
      <WorksheetTabs
        worksheet={currentWorksheet}
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
        canGrantAttempts={isInstructor}
      />
    </WorksheetLayout>
  )
}

const GRADE_QUERY_KEYS = ['user-grades', 'analytics-student', 'gradebook-summary']

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

  if (action.type === 'set-worksheet') {
    const nextWorksheet = typeof action.update === 'function'
      ? action.update(state.worksheet)
      : action.update
    if (nextWorksheet === state.worksheet) return state

    const selectedProofId = Number(nextWorksheet?.id) === Number(state.worksheet?.id)
      ? state.worksheet.proofs[state.currentProofIndex]?.id
      : null
    const selectedIndex = selectedProofId == null
      ? -1
      : nextWorksheet.proofs.findIndex((proof) => proof.id === selectedProofId)
    const currentProofIndex = selectedIndex >= 0
      ? selectedIndex
      : clampIndex(state.currentProofIndex, nextWorksheet?.proofs.length ?? 0)

    return { worksheet: nextWorksheet, currentProofIndex }
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

const QUESTION_SESSION_TRACKING_ENABLED = true

function RealWorksheetContent() {
  const { worksheetId, assignmentId } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const currentWorksheetRef = useRef(null)
  const restoredQuestionIndexForAssignmentRef = useRef(null)
  const [{ currentProofIndex, worksheet }, dispatchWorksheetView] = useReducer(
    worksheetViewReducer,
    { currentProofIndex: 0, worksheet: null }
  )
  const setCurrentProofIndex = useCallback((update) => {
    dispatchWorksheetView({ type: 'set-proof-index', update })
  }, [])
  const setWorksheet = useCallback((update) => {
    dispatchWorksheetView({ type: 'set-worksheet', update })
  }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [settledRequestKey, setSettledRequestKey] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [currentDueAt, setCurrentDueAt] = useState(null)
  const [questionScores, setQuestionScores] = useState({})
  const { activeCourseId, courses } = useCoursesState()
  const { assignmentsPath, isInstructor, user } = useAppRuntime()
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

  const currentWorksheet = worksheet?.id === worksheetIdNum ? worksheet : null
  currentWorksheetRef.current = currentWorksheet
  const currentProof = currentWorksheet?.proofs[currentProofIndex]
  const total = currentWorksheet?.proofs.length || 0
  const worksheetDueAt = currentWorksheet?.due_at
    ?? currentWorksheet?.due_date
    ?? currentDueAt
  const defaultBackTarget = assignmentsPath
  const backTarget = location?.state?.returnTo || defaultBackTarget

  useAssignmentSession(currentWorksheet?.id, activeUserId)

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
    setWorksheet((prev) => {
      if (!prev) return prev
      let didChange = false
      const proofs = prev.proofs.map((proof) => {
        const proofLogicSystem = logicSystemForQuestionType(proof.type, courseLogicSystem)
        if (proof.logicSystem === proofLogicSystem) return proof
        didChange = true
        return { ...proof, logicSystem: proofLogicSystem }
      })
      return didChange ? { ...prev, proofs } : prev
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
            /*
            give up for this attempt instead of hot-looping against a failing
            endpoint - the next activity/focus/question-switch event will retry.
            */
            break
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
      /*
      an idle timeout (or a failed create) can leave no active session while
      the user is still on a question. keystrokes/clicks/scroll resume it -
      previously only a focus/visibility event or switching questions could.
      */
      if (!questionSessionId.current && currentProof?.questionId) {
        desiredQuestionSessionQuestionIdRef.current = currentProof.questionId
        syncQuestionSession()
      }
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

    /*
    a normal PUT close request can't be relied on to finish before the page
    is torn down. sendBeacon queues a fire-and-forget POST that survives
    unload; pagehide (not beforeunload) covers tab close/navigation/refresh
    without blocking the back/forward cache.
    */
    const handlePageHide = () => {
      const activeSessionId = questionSessionId.current
      if (!activeSessionId || typeof navigator === 'undefined' || !navigator.sendBeacon) return
      navigator.sendBeacon(`${API_CONFIG.baseUrl}/api/question-sessions/${activeSessionId}/close`)
    }
    window.addEventListener('pagehide', handlePageHide)

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
      window.removeEventListener('pagehide', handlePageHide)
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
        setWorksheet((previous) => {
          if (Number(previous?.id) !== Number(assignmentId)) return previous
          const proofs = previous.proofs.filter(
            (proof) => Number(proof.questionId) !== Number(questionId)
          )
          return proofs.length === previous.proofs.length
            ? previous
            : { ...previous, proofs }
        })
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
      setWorksheet((previous) => {
        if (Number(previous?.id) !== Number(assignmentId)) return previous
        const proofs = previous.proofs.map((proof, idx) => {
          if (Number(proof.questionId) !== Number(questionId)) return proof
          const updated = mapQuestionToProof(targetQuestion, assignmentInfo, idx, courseLogicSystem)
          return {
            ...proof,
            ...updated,
            attemptCount: serverAttemptCount ?? proof.attemptCount ?? 0,
            attemptLimit: updated.attemptLimit ?? proof.attemptLimit,
          }
        })
        return { ...previous, proofs }
      })
    } catch (err) {
      // ignore refresh errors
    } finally {
      solutionRefreshRef.current.delete(questionId)
    }
  }, [activeUserId, courseLogicSystem])

  const handleQuestionCreated = useCallback((assignmentId, createdQuestion) => {
    if (!assignmentId || !createdQuestion) return
    setWorksheet((previous) => {
      if (Number(previous?.id) !== Number(assignmentId)) return previous
      const exists = previous.proofs.some((proof) => Number(proof.questionId) === Number(createdQuestion.id))
      if (exists) return previous
      const nextProof = mapQuestionToProof(createdQuestion, previous, previous.proofs.length, courseLogicSystem)
      return { ...previous, proofs: [...previous.proofs, nextProof] }
    })
    const shown = currentWorksheetRef.current
    if (Number(shown?.id) === Number(assignmentId)) {
      setCurrentProofIndex(shown.proofs.length)
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
        // unmounted while the worksheet is open, so these only mark stale; the refetch happens on next mount
        GRADE_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
      }
      if (Number.isFinite(questionId)) {
        // sync attempts
        setWorksheet((prev) => {
          if (!prev) return prev
          let didUpdate = false
          const proofs = prev.proofs.map((proof) => {
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
            didUpdate = true
            return { ...proof, attemptCount, attemptLimit }
          })
          return didUpdate ? { ...prev, proofs } : prev
        })
      }
      if (reachedLimit && Number.isFinite(questionId)) {
        const assignmentId = currentWorksheetRef.current?.id
        if (assignmentId) {
          refreshQuestionSolutions(assignmentId, questionId)
        }
      }
      // sidebar total is local only.
    }
    window.addEventListener(ASSIGNMENT_SUBMISSION_EVENT, handleSubmission)
    return () => window.removeEventListener(ASSIGNMENT_SUBMISSION_EVENT, handleSubmission)
  }, [refreshQuestionSolutions, queryClient])

  useEffect(() => {
    let isMounted = true

    const loadSavedStates = (worksheet, drafts, submissions) => {
      const questionIds = new Set()
      const proofMeta = {}

      worksheet.proofs.forEach((proof) => {
        if (proof.questionId) {
          questionIds.add(proof.questionId)
          proofMeta[proof.questionId] = proof
        }
      })

      const draftMap = new Map()
      drafts.forEach((draft) => {
        if (draft.user_id !== activeUserId) return
        if (!questionIds.has(draft.assignment_question_id)) return
        draftMap.set(draft.assignment_question_id, draft.draft_data)
      })

      const submissionMap = new Map()
      const correctQuestionIds = new Set()
      const attemptCountMap = new Map()
      const scoreByQuestion = new Map()
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

    const loadWorksheetDetails = async (assignmentId) => {
      const query = worksheetQuery(assignmentId, activeUserId)
      const { detail, drafts, submissions } = await queryClient.fetchQuery(query)
      // a prefetched copy is single use so coming back later reloads saved answers
      queryClient.removeQueries({ queryKey: query.queryKey })
      const assignmentInfo = detail.assignment
      // another class's assignment would map under this class's logic system
      if (Number(assignmentInfo?.course_id) !== Number(courseIdForApi)) return null
      const questions = detail.questions || []
      const policy = detail.policy || null
      const originalDueAt = assignmentInfo.due_at ?? assignmentInfo.due_date ?? null
      const effectiveDueAt = policy?.due_at ?? originalDueAt
      const worksheet = {
        id: assignmentInfo.id,
        title: assignmentInfo.title,
        kind: assignmentInfo.kind,
        due_at: effectiveDueAt,
        original_due_at: originalDueAt,
        policy,
        isLocked: assignmentInfo.is_locked ?? false,
        groupQuestionsByType: assignmentInfo.group_questions_by_type ?? false,
        proofs: questions.map((question, idx) =>
          mapQuestionToProof(question, assignmentInfo, idx, courseLogicSystem)
        ),
      }
      const { attemptCountMap, completedProofIds, scoreByQuestion } = loadSavedStates(worksheet, drafts, submissions)
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

    const loadWorksheet = async () => {
      setLoadError('')
      setIsLoading(true)
      try {
        if (!courseIdForApi) return
        // reruns like a logic system change keep the loaded worksheet
        if (currentWorksheetRef.current) return
        const loadedWorksheet = await loadWorksheetDetails(worksheetIdNum)
        if (isMounted) {
          setWorksheet(loadedWorksheet)
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load worksheet', error)
          const notAvailable = error?.status === 403 || error?.status === 404
          setLoadError(notAvailable
            ? 'This assignment is not available.'
            : 'Failed to load this assignment.')
          setWorksheet(null)
        }
      } finally {
        if (isMounted) {
          setSettledRequestKey(worksheetRequestKey)
          setIsLoading(false)
        }
      }
    }

    loadWorksheet()

    return () => {
      isMounted = false
    }
  }, [activeUserId, courseId, courseLogicSystem, worksheetIdNum, worksheetRequestKey])

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
        '& .logic-engine': { fontSize: '1.25rem' },
      }}
    >
      <WorksheetTextbookSplit
        practiceId={currentWorksheet.id}
        activityKind={currentWorksheet.kind}
      >
        <WorksheetLayout
          subtitle={currentWorksheet.title || "Predicate Logic: Natural Deduction"}
          backTo={backTarget}
          completedProofs={completedProofs}
          isOverdue={isOverdue}
          isLocked={currentWorksheet.isLocked ?? false}
          showPolicyInfo={false}
        >
          <WorksheetTabs
            key={`worksheet-${currentWorksheet?.id ?? worksheetIdNum}`}
            worksheet={currentWorksheet}
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
            canSubmitWhileLocked={hasStaffAccess(user, activeCourse?.role)}
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
