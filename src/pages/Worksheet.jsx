import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Box } from '@mui/material'
import WorksheetLayout from '../components/layout/WorksheetLayout.jsx'
import WorksheetTabs from '../components/problems/WorksheetTabs.jsx'
import { useScoring } from '../hooks/usescoring.js'
import { useProofState } from '../hooks/useproofstate.js'
import { useWorksheetMetrics } from '../hooks/useWorksheetMetrics.js'
// import { exportWorksheetPDF } from '../utils/exportPDF.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { useCoursesState } from '../context/CoursesContext.jsx'

const normalizeType = (snapshot) => (
  snapshot?.type || snapshot?.problemType || snapshot?.logic_problem_type || 'derivation'
)

const mapQuestionToProof = (question, assignment, index) => {
  const snapshot = question?.question_snapshot || {}
  const type = normalizeType(snapshot)
  const description = snapshot.prompt || snapshot.description || snapshot.text || 'Solve.'
  const questionId = question?.id ?? question?.assignment_question_id ?? question?.assignmentQuestionId ?? null
  const proofId = `${assignment.id}-${questionId ?? index}`
  const solution = snapshot.solution
  const attemptLimit = question?.attempt_limit ?? 3
  const legend = snapshot.legend || snapshot.legend_text || snapshot.legendText || ''
  const proofBase = {
    id: proofId,
    questionId,
    description,
    solution,
    attemptLimit,
    legend,
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

  if (type === 'combo-translation-derivation') {
    return {
      ...proofBase,
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

export default function Worksheet() {
  const { worksheetId, assignmentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentProofIndex, setCurrentProofIndex] = useState(0)
  const [worksheets, setWorksheets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [gradePercent, setGradePercent] = useState(null)
  const [currentDueAt, setCurrentDueAt] = useState(null)
  const { activeCourseId } = useCoursesState()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const sessionId = useRef(null)
  const questionSessionId = useRef(null)
  const activeUserId = getActiveUserId()
  const gradesCache = useRef(null)
  const gradeRefreshTimerRef = useRef(null)
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
  const isInstructorView = location.pathname.startsWith('/instructor')
  const assignmentPathBase = isInstructorView ? '/instructor/assignment' : '/student/assignment'
  const defaultBackTarget = isInstructorView ? '/instructor/assignments' : '/student/assignments'
  const backTarget = location?.state?.returnTo || defaultBackTarget
  
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
    gradePercent,
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

  const refreshGradePercent = useCallback(async () => {
    if (!currentWorksheet?.id || !activeUserId) return
    const assignmentId = currentWorksheet.id
    try {
      const grades = await fetchJson(`/api/users/${activeUserId}/grades`)
      gradesCache.current = new Map(
        (grades || []).map((grade) => [
          Number(grade.assignment_id ?? grade.Assignment?.id),
          grade,
        ])
      )
      if (!isMountedRef.current || assignmentId !== currentWorksheetIdRef.current) {
        return
      }
      const grade = gradesCache.current.get(Number(assignmentId))
      const total = grade?.max_score || 0
      const score = grade?.final_score ?? grade?.raw_score ?? null
      const percent = total > 0 && score !== null ? (score / total) * 100 : null
      setGradePercent(percent)
      setCurrentDueAt(currentWorksheet?.due_at ?? currentWorksheet?.due_date ?? null)
    } catch (error) {
      // keep the previous grade on transient refresh errors
    }
  }, [activeUserId, currentWorksheet?.id, currentWorksheet?.due_at, currentWorksheet?.due_date])

  const scheduleGradeRefresh = useCallback(() => {
    if (!currentWorksheet?.id || !activeUserId) return
    if (gradeRefreshTimerRef.current) return
    gradeRefreshTimerRef.current = setTimeout(() => {
      gradeRefreshTimerRef.current = null
      refreshGradePercent()
    }, 250)
  }, [activeUserId, currentWorksheet?.id, refreshGradePercent])

  const refreshQuestionSolutions = useCallback(async (assignmentId, questionId) => {
    if (!assignmentId || !questionId || !activeUserId) return
    if (solutionRefreshRef.current.has(questionId)) return
    solutionRefreshRef.current.add(questionId)
    try {
      const response = await fetchJson(
        `/api/assignments/${assignmentId}?userId=${activeUserId}`
      )
      const questions = response.questions || []
      const assignmentInfo = response.assignment || { id: assignmentId }
      const targetQuestion = questions.find((question) => (
        Number(question?.id ?? question?.assignment_question_id) === Number(questionId)
      ))
      if (!targetQuestion) {
        solutionRefreshRef.current.delete(questionId)
        return
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
              attemptCount: proof.attemptCount,
              attemptLimit: updated.attemptLimit ?? proof.attemptLimit,
            }
          })
          return { ...worksheet, proofs: nextProofs }
        })
      ))
    } catch (err) {
      solutionRefreshRef.current.delete(questionId)
    }
  }, [activeUserId])

  useEffect(() => {
    refreshGradePercent()
  }, [refreshGradePercent])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleSubmission = (event) => {
      const detail = event?.detail || {}
      const questionId = Number(detail.assignmentQuestionId)
      const attempt = Number(detail.attempt)
      const attemptLimit = Number(detail.attemptLimit)
      const reachedLimit = Number.isFinite(attempt) && Number.isFinite(attemptLimit)
        && attempt >= attemptLimit
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
      scheduleGradeRefresh()
    }
    window.addEventListener('assignment-submission', handleSubmission)
    return () => window.removeEventListener('assignment-submission', handleSubmission)
  }, [refreshQuestionSolutions, scheduleGradeRefresh])

  useEffect(() => {
    return () => {
      if (gradeRefreshTimerRef.current) {
        clearTimeout(gradeRefreshTimerRef.current)
        gradeRefreshTimerRef.current = null
      }
    }
  }, [currentWorksheet?.id])

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
      return { attemptCountMap, completedProofIds }
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
        due_at: assignmentInfo.due_at ?? assignmentInfo.due_date ?? null,
        isLocked: assignmentInfo.is_locked ?? false,
        proofs: questions.map((question, idx) =>
          mapQuestionToProof(question, assignmentInfo, idx)
        ),
      }
      const { attemptCountMap, completedProofIds } = await loadSavedStates([worksheet])
      setCompletedProofs(completedProofIds)
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
      navigate(`${assignmentPathBase}/${newWorksheet.id}`, {
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
    <Box sx={{ '& .logicpenguin': { fontSize: '16px' } }}>
      <WorksheetLayout
        subtitle={currentWorksheet.title || "Predicate Logic: Natural Deduction"}
        onBackToLMS={() => navigate(backTarget)}
        worksheets={worksheets}
        currentWorksheetIndex={currentWorksheetIndex}
        onWorksheetIndexChange={handleWorksheetChange}
        completedProofs={completedProofs}
        isOverdue={isOverdue}
      >
        <WorksheetTabs
          key={`worksheet-${currentWorksheet?.id ?? worksheetIdNum}`}
          worksheets={worksheets}
          currentWorksheetIndex={currentWorksheetIndex}
          onWorksheetIndexChange={handleWorksheetChange}
          currentProofIndex={currentProofIndex}
          onProofIndexChange={setCurrentProofIndex}
          completedProofs={completedProofs}
          onProofComplete={handleProofComplete}
          getSavedProofState={getSavedProofState}
          handleProofStateChange={handleProofStateChange}
          total={total}
          completionPercent={completionPercent}
          gradeLabel={gradeLabel}
          isOverdue={isOverdue}
        />
      </WorksheetLayout>
    </Box>
  )
}
