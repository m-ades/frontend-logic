import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  INSTRUCTOR_SANDBOX_COURSE,
  INSTRUCTOR_SANDBOX_STUDENTS,
  INSTRUCTOR_SANDBOX_USER,
  getInstructorSandboxAssignments,
  getInstructorSandboxPractices,
} from '../sandbox/instructorSandboxData.js'

const STORAGE_KEY = 'logicapp_instructor_sandbox_state_v1'
const InstructorSandboxContext = createContext(null)

const isPlainObject = (value) => (
  value != null && typeof value === 'object' && !Array.isArray(value)
)

const average = (values) => (
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
)

const median = (values) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

const addDaysToIso = (isoString, days) => {
  const date = new Date(isoString)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const numericTimestamp = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const cloneItems = (items = []) => items.map((item) => ({
  ...item,
  proofs: (item.proofs || []).map((proof) => ({ ...proof })),
}))

const createInitialState = () => ({
  activeCourseId: INSTRUCTOR_SANDBOX_COURSE.id,
  courses: [{ ...INSTRUCTOR_SANDBOX_COURSE }],
  assignmentsByCourse: {
    [INSTRUCTOR_SANDBOX_COURSE.id]: cloneItems(getInstructorSandboxAssignments()),
  },
  practicesByCourse: {
    [INSTRUCTOR_SANDBOX_COURSE.id]: cloneItems(getInstructorSandboxPractices()),
  },
  gradebookByCourse: {
    [INSTRUCTOR_SANDBOX_COURSE.id]: INSTRUCTOR_SANDBOX_STUDENTS.map((student) => ({ ...student })),
  },
  accommodationsByCourse: {},
  deadlinesByCourse: {},
  questionStates: {},
  completedQuestionIds: [],
  nextIds: {
    course: 9600,
    assignment: 9700,
    practice: 9800,
    student: 9900,
  },
})

const sanitizeState = (value) => {
  const initial = createInitialState()
  if (!isPlainObject(value)) return initial

  return {
    ...initial,
    activeCourseId: value.activeCourseId ?? initial.activeCourseId,
    courses: Array.isArray(value.courses) && value.courses.length > 0 ? value.courses : initial.courses,
    assignmentsByCourse: isPlainObject(value.assignmentsByCourse) ? value.assignmentsByCourse : initial.assignmentsByCourse,
    practicesByCourse: isPlainObject(value.practicesByCourse) ? value.practicesByCourse : initial.practicesByCourse,
    gradebookByCourse: isPlainObject(value.gradebookByCourse) ? value.gradebookByCourse : initial.gradebookByCourse,
    accommodationsByCourse: isPlainObject(value.accommodationsByCourse) ? value.accommodationsByCourse : {},
    deadlinesByCourse: isPlainObject(value.deadlinesByCourse) ? value.deadlinesByCourse : {},
    questionStates: isPlainObject(value.questionStates) ? value.questionStates : {},
    completedQuestionIds: Array.isArray(value.completedQuestionIds) ? value.completedQuestionIds : [],
    nextIds: isPlainObject(value.nextIds) ? { ...initial.nextIds, ...value.nextIds } : initial.nextIds,
  }
}

const readStoredState = () => {
  if (typeof window === 'undefined') return createInitialState()
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? sanitizeState(JSON.parse(raw)) : createInitialState()
  } catch {
    return createInitialState()
  }
}

const buildDueFields = (dueDate, dueTime) => {
  const safeTime = dueTime || '23:59'
  const dueAt = dueDate ? new Date(`${dueDate}T${safeTime}:00`).toISOString() : null
  return {
    dueAt,
    due_at: dueAt,
    dueDate: dueDate || '',
    dueTime: safeTime,
  }
}

const nextCopyName = (name) => `${name} (Copy)`

const mapByCourse = (records, courseId, mapper) => ({
  ...records,
  [courseId]: (records?.[courseId] || []).map(mapper),
})

const appendByCourse = (records, courseId, item) => ({
  ...records,
  [courseId]: [...(records?.[courseId] || []), item],
})

const filterByCourse = (records, courseId, predicate) => ({
  ...records,
  [courseId]: (records?.[courseId] || []).filter(predicate),
})

const makeStudentRecord = (id, username, role = 'student') => ({
  id,
  username,
  role,
  grades: {},
  submittedAssignments: {},
  lateSubmissions: {},
  submissionDates: {},
  attemptCounts: {},
  practices: {},
})

const normalizeQuestionState = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  return { ans: value }
}

export function InstructorSandboxProvider({ children }) {
  const [state, setState] = useState(readStoredState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const completedQuestionIds = useMemo(
    () => new Set(state.completedQuestionIds || []),
    [state.completedQuestionIds]
  )

  const courseState = useMemo(() => {
    const studentCountByCourse = Object.fromEntries(
      Object.entries(state.gradebookByCourse || {}).map(([courseId, students]) => [courseId, students.length])
    )

    const courses = (state.courses || []).map((course) => ({
      ...course,
      studentCount: studentCountByCourse[course.id] ?? course.studentCount ?? 0,
    }))

    const practicesByCourse = Object.fromEntries(
      Object.entries(state.practicesByCourse || {}).map(([courseId, practices]) => {
        const students = state.gradebookByCourse?.[courseId] || []
        const enhancedPractices = (practices || []).map((practice) => {
          const attempts = students.reduce(
            (sum, student) => sum + (Number(student.practices?.[practice.id]?.attempts) || 0),
            0
          )
          const completions = students.filter(
            (student) => student.practices?.[practice.id]?.completed
          ).length
          return {
            ...practice,
            attempts,
            completions,
          }
        })
        return [courseId, enhancedPractices]
      })
    )

    return {
      courses,
      activeCourseId: state.activeCourseId,
      assignmentsByCourse: state.assignmentsByCourse || {},
      practicesByCourse,
      gradebookByCourse: state.gradebookByCourse || {},
      loading: false,
      error: null,
      initialized: true,
    }
  }, [state.activeCourseId, state.assignmentsByCourse, state.courses, state.gradebookByCourse, state.practicesByCourse])

  const gradebookSummaryByCourse = useMemo(() => (
    Object.fromEntries(
      Object.entries(courseState.assignmentsByCourse || {}).map(([courseId, assignments]) => {
        const students = courseState.gradebookByCourse?.[courseId] || []
        const summary = (assignments || []).map((assignment) => {
          const grades = students
            .map((student) => student.grades?.[assignment.id])
            .filter((value) => Number.isFinite(value))
          return {
            id: assignment.id,
            title: assignment.name || assignment.title,
            due_at: assignment.dueAt || assignment.due_at,
            is_locked: assignment.isLocked === true,
            avg_percent: grades.length > 0 ? average(grades) / 100 : 0,
            median_percent: grades.length > 0 ? median(grades) / 100 : 0,
          }
        })
        return [courseId, summary]
      })
    )
  ), [courseState.assignmentsByCourse, courseState.gradebookByCourse])

  const dashboardAnalyticsByCourse = useMemo(() => (
    Object.fromEntries(
      Object.entries(courseState.assignmentsByCourse || {}).map(([courseId, assignments]) => {
        const students = courseState.gradebookByCourse?.[courseId] || []
        const assignmentStats = (assignments || []).map((assignment) => {
          const grades = students
            .map((student) => Number(student.grades?.[assignment.id]))
            .filter((value) => Number.isFinite(value))
          const attempts = students
            .map((student) => Number(student.attemptCounts?.[assignment.id] || 0))
            .filter((value) => Number.isFinite(value) && value > 0)
          const questionCount = Number(assignment.questionCount || assignment.question_count || assignment.proofs?.length || 1)
          return {
            id: assignment.id,
            students_submitted: students.filter((student) => Boolean(student.submittedAssignments?.[assignment.id])).length,
            avg_score: grades.length > 0 ? average(grades) : null,
            avg_attempt: average(attempts),
            avg_minutes_per_question: 8 + questionCount * 2,
            median_minutes_per_question: 6 + questionCount * 2,
          }
        })

        const timeByCategory = (assignments || []).map((assignment) => ({
          key: `chapter-${assignment.chapter || 'other'}`,
          label: assignment.subchapter || `Chapter ${assignment.chapter || 'Other'}`,
          avg_minutes: 8 + Number(assignment.chapter || 1) * 2,
        }))

        return [courseId, {
          analytics: {
            gradeSummary: null,
            assignmentStats,
            timeByCategory,
          },
          gradebookSummary: gradebookSummaryByCourse[courseId] || [],
        }]
      })
    )
  ), [courseState.assignmentsByCourse, courseState.gradebookByCourse, gradebookSummaryByCourse])

  const setActiveCourseId = (courseId) => {
    setState((prev) => ({ ...prev, activeCourseId: courseId }))
  }

  const addNewCourse = async (courseData) => {
    let createdCourse = null
    setState((prev) => {
      const courseId = prev.nextIds.course
      createdCourse = {
        id: courseId,
        name: courseData.name ?? courseData.title ?? 'Untitled Course',
        code: courseData.code ?? courseData.course_code ?? `DEMO-${courseId}`,
        semester: courseData.term ?? courseData.semester ?? 'Demo Session',
        status: courseData.status ?? 'current',
        createdAt: new Date().toISOString(),
        studentCount: 0,
        color: '#536DFE',
        role: 'instructor',
        latePolicy: { ...INSTRUCTOR_SANDBOX_COURSE.latePolicy },
        gradingScale: INSTRUCTOR_SANDBOX_COURSE.gradingScale.map((entry) => ({ ...entry })),
      }

      return {
        ...prev,
        activeCourseId: courseId,
        courses: [...prev.courses, createdCourse],
        assignmentsByCourse: { ...prev.assignmentsByCourse, [courseId]: [] },
        practicesByCourse: { ...prev.practicesByCourse, [courseId]: [] },
        gradebookByCourse: { ...prev.gradebookByCourse, [courseId]: [] },
        nextIds: { ...prev.nextIds, course: courseId + 1 },
      }
    })
    return createdCourse
  }

  const buildActivityRecord = (courseId, itemId, formData, kind, previousItem = null) => ({
    id: itemId,
    courseId,
    course_id: courseId,
    name: formData.name,
    title: formData.name,
    description: previousItem?.description || null,
    kind,
    chapter: Number(formData.chapter) || 1,
    subchapter: formData.subchapter || '',
    publishDate: formData.publishDate || previousItem?.publishDate || new Date().toLocaleDateString('en-CA'),
    publishTime: formData.publishTime || previousItem?.publishTime || '00:00',
    ...buildDueFields(formData.dueDate, formData.dueTime || '23:59'),
    totalPoints: previousItem?.totalPoints || previousItem?.total_points || 100,
    total_points: previousItem?.totalPoints || previousItem?.total_points || 100,
    questionCount: previousItem?.questionCount || previousItem?.question_count || previousItem?.proofs?.length || 0,
    question_count: previousItem?.questionCount || previousItem?.question_count || previousItem?.proofs?.length || 0,
    isPublished: previousItem?.isPublished ?? true,
    isLocked: formData.isLocked ?? false,
    lateWindowDays: previousItem?.lateWindowDays ?? 3,
    latePenaltyPercent: previousItem?.latePenaltyPercent ?? 10,
    allowRetakes: kind === 'practice' ? (formData.allowRetakes ?? previousItem?.allowRetakes ?? true) : undefined,
    showSolutions: kind === 'practice' ? (formData.showSolutions ?? previousItem?.showSolutions ?? true) : undefined,
    proofs: previousItem?.proofs ? previousItem.proofs.map((proof) => ({ ...proof })) : [],
  })

  const upsertActivity = (bucket, courseId, itemId, updater) => ({
    ...bucket,
    [courseId]: (bucket?.[courseId] || []).map((item) => (
      item.id === itemId ? updater(item) : item
    )),
  })

  const duplicateActivityRecord = (item, nextId, prefix) => ({
    ...item,
    id: nextId,
    name: nextCopyName(item.name),
    title: nextCopyName(item.title || item.name),
    isLocked: true,
    isPublished: true,
    proofs: (item.proofs || []).map((proof, index) => ({
      ...proof,
      id: `${prefix}-${nextId}-q-${index + 1}`,
      questionId: `${prefix}-${nextId}-q-${index + 1}`,
    })),
  })

  const createAssignment = async (courseId, formData) => {
    let created = null
    setState((prev) => {
      const nextId = prev.nextIds.assignment
      const template = prev.assignmentsByCourse?.[courseId]?.[0] || getInstructorSandboxAssignments()[0]
      created = buildActivityRecord(courseId, nextId, formData, 'assignment', template)
      return {
        ...prev,
        assignmentsByCourse: appendByCourse(prev.assignmentsByCourse, courseId, created),
        nextIds: { ...prev.nextIds, assignment: nextId + 1 },
      }
    })
    return created
  }

  const updateAssignment = async (courseId, assignmentId, formData) => {
    setState((prev) => ({
      ...prev,
      assignmentsByCourse: upsertActivity(
        prev.assignmentsByCourse,
        courseId,
        assignmentId,
        (assignment) => buildActivityRecord(courseId, assignmentId, formData, 'assignment', assignment)
      ),
    }))
  }

  const toggleAssignmentLock = async (courseId, assignmentId) => {
    setState((prev) => ({
      ...prev,
      assignmentsByCourse: upsertActivity(prev.assignmentsByCourse, courseId, assignmentId, (assignment) => ({
        ...assignment,
        isLocked: !assignment.isLocked,
      })),
    }))
  }

  const toggleAssignmentPublish = async (courseId, assignmentId) => {
    setState((prev) => ({
      ...prev,
      assignmentsByCourse: upsertActivity(prev.assignmentsByCourse, courseId, assignmentId, (assignment) => ({
        ...assignment,
        isPublished: !assignment.isPublished,
        isLocked: assignment.isLocked || assignment.isPublished,
      })),
    }))
  }

  const duplicateAssignment = async (courseId, assignment) => {
    let created = null
    setState((prev) => {
      const nextId = prev.nextIds.assignment
      created = duplicateActivityRecord(assignment, nextId, 'sandbox-assignment')
      return {
        ...prev,
        assignmentsByCourse: appendByCourse(prev.assignmentsByCourse, courseId, created),
        nextIds: { ...prev.nextIds, assignment: nextId + 1 },
      }
    })
    return created
  }

  const deleteAssignment = async (courseId, assignmentId) => {
    setState((prev) => ({
      ...prev,
      assignmentsByCourse: filterByCourse(prev.assignmentsByCourse, courseId, (assignment) => assignment.id !== assignmentId),
    }))
  }

  const updateAssignmentDueDate = async (courseId, assignmentId, dueDate, dueTime) => {
    setState((prev) => ({
      ...prev,
      assignmentsByCourse: upsertActivity(prev.assignmentsByCourse, courseId, assignmentId, (assignment) => ({
        ...assignment,
        ...buildDueFields(dueDate, dueTime),
      })),
    }))
  }

  const createPractice = async (courseId, formData) => {
    let created = null
    setState((prev) => {
      const nextId = prev.nextIds.practice
      const template = prev.practicesByCourse?.[courseId]?.[0] || getInstructorSandboxPractices()[0]
      created = buildActivityRecord(courseId, nextId, formData, 'practice', template)
      return {
        ...prev,
        practicesByCourse: appendByCourse(prev.practicesByCourse, courseId, created),
        nextIds: { ...prev.nextIds, practice: nextId + 1 },
      }
    })
    return created
  }

  const updatePractice = async (courseId, practiceId, formData) => {
    setState((prev) => ({
      ...prev,
      practicesByCourse: upsertActivity(
        prev.practicesByCourse,
        courseId,
        practiceId,
        (practice) => buildActivityRecord(courseId, practiceId, formData, 'practice', practice)
      ),
    }))
  }

  const togglePracticeLock = async (courseId, practiceId) => {
    setState((prev) => ({
      ...prev,
      practicesByCourse: upsertActivity(prev.practicesByCourse, courseId, practiceId, (practice) => ({
        ...practice,
        isLocked: !practice.isLocked,
      })),
    }))
  }

  const togglePracticePublish = async (courseId, practiceId) => {
    setState((prev) => ({
      ...prev,
      practicesByCourse: upsertActivity(prev.practicesByCourse, courseId, practiceId, (practice) => ({
        ...practice,
        isPublished: !practice.isPublished,
        isLocked: practice.isLocked || practice.isPublished,
      })),
    }))
  }

  const duplicatePractice = async (courseId, practice) => {
    let created = null
    setState((prev) => {
      const nextId = prev.nextIds.practice
      created = duplicateActivityRecord(practice, nextId, 'sandbox-practice')
      return {
        ...prev,
        practicesByCourse: appendByCourse(prev.practicesByCourse, courseId, created),
        nextIds: { ...prev.nextIds, practice: nextId + 1 },
      }
    })
    return created
  }

  const deletePractice = async (courseId, practiceId) => {
    setState((prev) => ({
      ...prev,
      practicesByCourse: filterByCourse(prev.practicesByCourse, courseId, (practice) => practice.id !== practiceId),
    }))
  }

  const updateCourseSettings = async (courseId, settings) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => (
        course.id === courseId
          ? {
              ...course,
              ...(settings.name ? { name: settings.name } : {}),
              ...(settings.code ? { code: settings.code } : {}),
              ...(settings.semester ? { semester: settings.semester } : {}),
              ...(settings.color ? { color: settings.color } : {}),
              ...(settings.latePolicy ? { latePolicy: settings.latePolicy } : {}),
              ...(settings.gradingScale ? { gradingScale: settings.gradingScale } : {}),
              ...(settings.status ? { status: settings.status } : {}),
            }
          : course
      )),
    }))
  }

  const toggleArchiveCourse = async (courseId, archive = true) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => (
        course.id === courseId ? { ...course, status: archive ? 'past' : 'current' } : course
      )),
    }))
  }

  const addStudent = async (courseId, studentData) => {
    let created = null
    setState((prev) => {
      const nextId = prev.nextIds.student
      created = makeStudentRecord(nextId, studentData.username)
      return {
        ...prev,
        gradebookByCourse: appendByCourse(prev.gradebookByCourse, courseId, created),
        nextIds: { ...prev.nextIds, student: nextId + 1 },
      }
    })
    return created
  }

  const bulkAddStudents = async (courseId, studentsToImport) => {
    const createdStudents = []
    setState((prev) => {
      let nextId = prev.nextIds.student
      const nextStudents = studentsToImport.map((student) => {
        const created = makeStudentRecord(nextId++, student.username)
        createdStudents.push(created)
        return created
      })

      return {
        ...prev,
        gradebookByCourse: {
          ...prev.gradebookByCourse,
          [courseId]: [...(prev.gradebookByCourse?.[courseId] || []), ...nextStudents],
        },
        nextIds: { ...prev.nextIds, student: nextId },
      }
    })
    return createdStudents
  }

  const removeStudent = async (courseId, studentId) => {
    setState((prev) => ({
      ...prev,
      gradebookByCourse: filterByCourse(prev.gradebookByCourse, courseId, (student) => student.id !== studentId),
    }))
  }

  const updateStudentRole = async (courseId, userId, role) => {
    setState((prev) => ({
      ...prev,
      gradebookByCourse: mapByCourse(prev.gradebookByCourse, courseId, (student) => (
        student.id === userId ? { ...student, role } : student
      )),
    }))
  }

  const getAccommodations = async (courseId, userId) => {
    const record = state.accommodationsByCourse?.[courseId]?.[userId]
    return record ? [{ user_id: userId, ...record }] : []
  }

  const saveAccommodations = async (courseId, userId, payload) => {
    setState((prev) => ({
      ...prev,
      accommodationsByCourse: {
        ...prev.accommodationsByCourse,
        [courseId]: {
          ...(prev.accommodationsByCourse?.[courseId] || {}),
          [userId]: {
            extra_late_days: Math.max(0, Number(payload.extra_late_days) || 0),
            late_penalty_waived: Boolean(payload.late_penalty_waived),
          },
        },
      },
    }))
  }

  const getDeadlines = async (courseId, userId) => {
    const accommodation = state.accommodationsByCourse?.[courseId]?.[userId] || {}
    const assignmentMap = state.assignmentsByCourse?.[courseId] || []
    const deadlineOverrides = state.deadlinesByCourse?.[courseId]?.[userId] || {}

    return assignmentMap
      .map((assignment) => {
        const extension_due_at = deadlineOverrides?.[assignment.id]?.extension_due_at || null
        const extra_late_days = Math.max(0, Number(accommodation.extra_late_days) || 0)
        const late_penalty_waived = Boolean(accommodation.late_penalty_waived)
        const baseDueAt = assignment.dueAt || assignment.due_at || null
        const accommodation_due_at =
          baseDueAt && extra_late_days > 0 ? addDaysToIso(baseDueAt, extra_late_days) : null

        if (!extension_due_at && !late_penalty_waived && extra_late_days <= 0) {
          return null
        }

        return {
          assignment_id: assignment.id,
          user_id: userId,
          extension_due_at,
          extra_late_days,
          late_penalty_waived,
          accommodation_due_at,
        }
      })
      .filter(Boolean)
  }

  const saveDeadline = async (courseId, assignmentId, userId, extendedDueDate) => {
    setState((prev) => ({
      ...prev,
      deadlinesByCourse: {
        ...prev.deadlinesByCourse,
        [courseId]: {
          ...(prev.deadlinesByCourse?.[courseId] || {}),
          [userId]: {
            ...(prev.deadlinesByCourse?.[courseId]?.[userId] || {}),
            [assignmentId]: {
              assignment_id: assignmentId,
              user_id: userId,
              extension_due_at: extendedDueDate,
            },
          },
        },
      },
    }))
  }

  const getActivity = (activityId) => {
    const assignments = Object.values(courseState.assignmentsByCourse || {}).flat()
    const practices = Object.values(courseState.practicesByCourse || {}).flat()
    return [...assignments, ...practices].find((item) => String(item.id) === String(activityId)) || null
  }

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

  const resetDemo = () => {
    setState(createInitialState())
  }

  const value = {
    user: INSTRUCTOR_SANDBOX_USER,
    courseState,
    courses: courseState.courses,
    activeCourseId: courseState.activeCourseId,
    assignments: courseState.assignmentsByCourse?.[courseState.activeCourseId] || [],
    practices: courseState.practicesByCourse?.[courseState.activeCourseId] || [],
    students: courseState.gradebookByCourse?.[courseState.activeCourseId] || [],
    dashboardAnalyticsByCourse,
    gradebookSummaryByCourse,
    setActiveCourseId,
    addNewCourse,
    createAssignment,
    updateAssignment,
    toggleAssignmentLock,
    toggleAssignmentPublish,
    duplicateAssignment,
    deleteAssignment,
    updateAssignmentDueDate,
    createPractice,
    updatePractice,
    togglePracticeLock,
    togglePracticePublish,
    duplicatePractice,
    deletePractice,
    updateCourseSettings,
    toggleArchiveCourse,
    addStudent,
    bulkAddStudents,
    removeStudent,
    updateStudentRole,
    getAccommodations,
    saveAccommodations,
    getDeadlines,
    saveDeadline,
    getActivity,
    getQuestionState: (questionId) => state.questionStates?.[questionId] || null,
    isQuestionComplete: (questionId) => completedQuestionIds.has(questionId),
    updateQuestionState,
    markQuestionComplete,
    resetDemo,
  }

  return (
    <InstructorSandboxContext.Provider value={value}>
      {children}
    </InstructorSandboxContext.Provider>
  )
}

export function useInstructorSandbox() {
  const context = useContext(InstructorSandboxContext)
  if (!context) {
    throw new Error('useInstructorSandbox must be used within InstructorSandboxProvider')
  }
  return context
}
