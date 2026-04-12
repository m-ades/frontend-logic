import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  SANDBOX_COURSE,
  SANDBOX_RECENT_ACTIVITY,
  getSandboxAssignments,
  getSandboxClassroomAnalytics,
  getSandboxGradebookSummary,
  getSandboxPractices,
  SANDBOX_USER,
} from '../sandbox/mockData.js'

const STORAGE_KEY = 'logicapp_sandbox_state_v1'
const SandboxContext = createContext(null)

const readStoredState = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const createInitialState = () => ({
  activeCourseId: SANDBOX_COURSE.id,
  questionStates: {},
  completedQuestionIds: [],
})

const normalizeQuestionState = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  return { ans: value }
}

const percentile = (values, ratio) => {
  if (!Array.isArray(values) || values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1))
  return sorted[index]
}

const assignmentBaseScore = (assignment) => (
  assignment.proofs.length > 0 ? assignment.total_points / assignment.proofs.length : 0
)

const numericTimestamp = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const hasSubmittedProof = (proof) => {
  const attemptCount = Number(proof?.attemptCount)
  return (
    Number.isFinite(attemptCount) && attemptCount > 0
  ) || proof?.lastStatus != null || Number.isFinite(Number(proof?.rawScore))
}

const assignmentPercent = (grade) => {
  const maxScore = Number(grade?.max_score) || 0
  const finalScore = grade?.final_score ?? grade?.raw_score ?? null
  return maxScore > 0 && finalScore != null ? (finalScore / maxScore) * 100 : 0
}

export function SandboxProvider({ children }) {
  const [state, setState] = useState(() => readStoredState() || createInitialState())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const completedQuestionIds = useMemo(
    () => new Set(state.completedQuestionIds || []),
    [state.completedQuestionIds]
  )
  const questionStateMap = useMemo(
    () => state.questionStates || {},
    [state.questionStates]
  )

  const assignments = useMemo(
    () => getSandboxAssignments().map((assignment) => {
      const proofs = assignment.proofs.map((proof) => {
        const saved = questionStateMap[proof.id] || {}
        return {
          ...proof,
          attemptCount: Number(saved.attemptCount) || 0,
          lastStatus: saved.lastStatus ?? null,
          rawScore: Number.isFinite(Number(saved.rawScore)) ? Number(saved.rawScore) : null,
          completedAt: numericTimestamp(saved.completedAt),
          lastTouchedAt: numericTimestamp(saved.lastTouchedAt),
        }
      })
      const questionCount = proofs.length
      const answeredCount = proofs.filter((proof) => completedQuestionIds.has(proof.id)).length
      const attemptedProofs = proofs.filter((proof) => hasSubmittedProof(proof))
      const attemptTimestamps = attemptedProofs
        .map((proof) => proof.lastTouchedAt)
        .filter((value) => Number.isFinite(value))
      const completionTimestamps = proofs
        .map((proof) => proof.completedAt)
        .filter((value) => Number.isFinite(value))
      const completed = questionCount > 0 && answeredCount === questionCount
      const attempted = attemptedProofs.length > 0
      return {
        ...assignment,
        proofs,
        question_count: questionCount,
        answered_count: answeredCount,
        attempted_count: attemptedProofs.length,
        attempted,
        completed,
        submitted_at: attempted && attemptTimestamps.length > 0 ? new Date(Math.max(...attemptTimestamps)).toISOString() : null,
        completed_at: completed && completionTimestamps.length > 0 ? new Date(Math.max(...completionTimestamps)).toISOString() : null,
      }
    }),
    [completedQuestionIds, questionStateMap]
  )

  const assignmentsById = useMemo(
    () => new Map(assignments.map((assignment) => [String(assignment.id), assignment])),
    [assignments]
  )
  const practices = useMemo(() => getSandboxPractices(), [])
  const practicesById = useMemo(
    () => new Map(practices.map((practice) => [String(practice.id), practice])),
    [practices]
  )

  const grades = useMemo(
    () => assignments.map((assignment) => {
      const pointsPerQuestion = assignmentBaseScore(assignment)
      const rawScore = assignment.proofs.reduce((sum, proof) => {
        const proofScore = Number(proof?.rawScore)
        if (!Number.isFinite(proofScore)) return sum
        return sum + (Math.max(0, Math.min(100, proofScore)) / 100) * pointsPerQuestion
      }, 0)
      const isCompleted = assignment.completed === true
      return {
        assignment_id: assignment.id,
        max_score: assignment.total_points,
        raw_score: rawScore,
        final_score: rawScore,
        graded_at: isCompleted ? assignment.completed_at : null,
        graded_by: isCompleted ? 'sandbox-checker' : null,
        Assignment: assignment,
      }
    }),
    [assignments]
  )

  const metrics = useMemo(() => {
    const totalAssignments = assignments.length
    const totalQuestions = assignments.reduce((sum, assignment) => sum + assignment.question_count, 0)
    const completedAssignments = assignments.filter((assignment) => assignment.completed).length
    const completedQuestions = assignments.reduce((sum, assignment) => sum + assignment.answered_count, 0)
    const totalPossiblePoints = grades.reduce((sum, grade) => sum + (Number(grade?.max_score) || 0), 0)
    const totalEarnedPoints = grades.reduce((sum, grade) => sum + (Number(grade?.final_score ?? grade?.raw_score) || 0), 0)
    const averageScore = totalPossiblePoints > 0
      ? (totalEarnedPoints / totalPossiblePoints) * 100
      : 0
    return {
      totalAssignments,
      totalQuestions,
      completedAssignments,
      completedQuestions,
      averageScore,
      completionPercent: totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0,
    }
  }, [assignments, grades])

  const dashboardAnalytics = useMemo(() => {
    const classroomAnalytics = getSandboxClassroomAnalytics()
    const dynamicUpcoming = classroomAnalytics.assignments.upcomingList
      .map((item) => {
        const assignment = assignmentsById.get(String(item.id))
        return assignment ? {
          id: assignment.id,
          title: assignment.title,
          due_at: assignment.due_at,
        } : item
      })
      .slice(0, 2)
    const gradedAssignments = grades.filter((grade) => grade.graded_at != null || grade.graded_by != null)
    const submittedAssignmentIds = gradedAssignments.map((grade) => grade.assignment_id)
    const questionStates = Object.values(state.questionStates || {})
    const attemptCounts = questionStates
      .map((entry) => Number(entry?.attemptCount))
      .filter((value) => Number.isFinite(value) && value > 0)
    const avgAttempt = attemptCounts.length > 0
      ? attemptCounts.reduce((sum, value) => sum + value, 0) / attemptCounts.length
      : 0
    const correctRate = metrics.totalQuestions > 0
      ? metrics.completedQuestions / metrics.totalQuestions
      : 0
    const completedDurations = questionStates
      .map((entry) => {
        const startedAt = Number(entry?.startedAt)
        const completedAt = Number(entry?.completedAt)
        if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
          return null
        }
        return Math.max(1, (completedAt - startedAt) / 60000)
      })
      .filter((value) => Number.isFinite(value) && value > 0)
    const medianMinutes = percentile(completedDurations, 0.5)
    const p75Minutes = percentile(completedDurations, 0.75)
    const submissionCount = questionStates
      .filter((entry) => Number.isFinite(Number(entry?.completedAt)) || Number.isFinite(Number(entry?.attemptCount)))
      .length

    return {
      assignments: {
        ...classroomAnalytics.assignments,
        upcomingList: dynamicUpcoming,
      },
      performance: {
        avg_score: metrics.averageScore / 100,
        avg_attempt: avgAttempt,
        correct_rate: correctRate,
        first_try_correct_rate: correctRate > 0 ? Math.max(0, correctRate - 0.12) : 0,
      },
      time: {
        ...classroomAnalytics.time,
        median_minutes_per_question: medianMinutes,
        avg_minutes_per_question: medianMinutes,
        p75_minutes_per_question: p75Minutes,
      },
      submissionCount,
      submittedAssignmentIds,
      assignmentGrades: grades.map((grade) => ({
        assignment_id: grade.assignment_id,
        max_score: grade.max_score,
        final_score: grade.final_score,
        raw_score: grade.raw_score,
        Assignment: grade.Assignment,
      })),
    }
  }, [assignmentsById, grades, metrics.averageScore, metrics.completedQuestions, metrics.totalQuestions, state.questionStates])

  const updateQuestionState = (questionId, nextState) => {
    setState((prev) => ({
      ...prev,
      questionStates: {
        ...prev.questionStates,
        [questionId]: (() => {
          const now = Date.now()
          const previous = normalizeQuestionState(prev.questionStates?.[questionId] || {})
          const incoming = normalizeQuestionState(nextState)
          return {
            ...previous,
            ...incoming,
            startedAt: previous.startedAt ?? now,
            lastTouchedAt: now,
          }
        })(),
      },
    }))
  }

  const markQuestionComplete = (questionId) => {
    setState((prev) => {
      const next = new Set(prev.completedQuestionIds || [])
      next.add(questionId)
      return {
        ...prev,
        completedQuestionIds: Array.from(next),
        questionStates: {
          ...prev.questionStates,
          [questionId]: {
            ...normalizeQuestionState(prev.questionStates?.[questionId] || {}),
            startedAt: prev.questionStates?.[questionId]?.startedAt ?? Date.now(),
            completedAt: prev.questionStates?.[questionId]?.completedAt ?? Date.now(),
            lastTouchedAt: Date.now(),
          },
        },
      }
    })
  }

  const resetSandbox = () => {
    setState(createInitialState())
  }

  const value = {
    user: SANDBOX_USER,
    courses: [SANDBOX_COURSE],
    activeCourseId: state.activeCourseId || SANDBOX_COURSE.id,
    assignments,
    practices,
    grades,
    metrics,
    dashboardAnalytics,
    dashboardGradebookSummary: getSandboxGradebookSummary(),
    recentActivity: SANDBOX_RECENT_ACTIVITY,
    getAssignment: (assignmentId) => (
      assignmentsById.get(String(assignmentId))
      || practicesById.get(String(assignmentId))
      || null
    ),
    getQuestionState: (questionId) => state.questionStates?.[questionId] || null,
    isQuestionComplete: (questionId) => completedQuestionIds.has(questionId),
    updateQuestionState,
    markQuestionComplete,
    setActiveCourseId: (courseId) => {
      setState((prev) => ({ ...prev, activeCourseId: courseId }))
    },
    resetSandbox,
  }

  return (
    <SandboxContext.Provider value={value}>
      {children}
    </SandboxContext.Provider>
  )
}

export function useSandbox() {
  const context = useContext(SandboxContext)
  if (!context) {
    throw new Error('useSandbox must be used within SandboxProvider')
  }
  return context
}
