import { getSandboxAssignments, getSandboxPractices } from './mockData.js'

const EASTERN = 'America/New_York'

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

const addHours = (date, hours) => {
  const next = new Date(date)
  next.setHours(next.getHours() + hours)
  return next.toISOString()
}

const splitDateTime = (isoString) => {
  const date = new Date(isoString)
  return {
    dueDate: date.toLocaleDateString('en-CA', { timeZone: EASTERN }),
    dueTime: date.toLocaleTimeString('en-GB', {
      timeZone: EASTERN,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

const cloneProofs = (prefix, proofs = []) => (
  proofs.map((proof, index) => ({
    ...proof,
    id: `${prefix}-q-${index + 1}`,
    questionId: `${prefix}-q-${index + 1}`,
  }))
)

const now = new Date()

export const INSTRUCTOR_SANDBOX_USER = {
  id: 9001,
  username: 'Demo Instructor',
  role: 'instructor',
}

export const INSTRUCTOR_SANDBOX_COURSE = {
  id: 9101,
  name: 'Introduction to Logic',
  code: 'PHIL 275',
  semester: 'Spring 2026 Demo',
  status: 'current',
  createdAt: addDays(now, -45),
  studentCount: 15,
  color: '#536DFE',
  role: 'instructor',
  latePolicy: {
    enabled: true,
    maxDaysLate: 3,
    penalty: 10,
  },
  gradingScale: [
    { letter: 'A', minPercent: 90, maxPercent: 100, color: '#10b981' },
    { letter: 'B', minPercent: 80, maxPercent: 89, color: '#6366f1' },
    { letter: 'C', minPercent: 70, maxPercent: 79, color: '#f59e0b' },
    { letter: 'D', minPercent: 60, maxPercent: 69, color: '#f97316' },
    { letter: 'F', minPercent: 0, maxPercent: 59, color: '#ef4444' },
  ],
}

export const getInstructorSandboxAssignments = () => getSandboxAssignments().map((assignment, index) => {
  const dueAt = assignment.due_at
  const publishAt = addDays(new Date(dueAt), -3)
  const publish = splitDateTime(publishAt)
  const due = splitDateTime(dueAt)

  return {
    id: 9111 + index,
    courseId: INSTRUCTOR_SANDBOX_COURSE.id,
    course_id: INSTRUCTOR_SANDBOX_COURSE.id,
    name: assignment.title,
    title: assignment.title,
    description: assignment.description,
    kind: 'assignment',
    chapter: assignment.chapter,
    subchapter: assignment.subchapter,
    publishDate: publish.dueDate,
    publishTime: publish.dueTime,
    dueAt,
    due_at: dueAt,
    dueDate: due.dueDate,
    dueTime: due.dueTime,
    totalPoints: assignment.total_points,
    total_points: assignment.total_points,
    questionCount: assignment.proofs.length,
    question_count: assignment.proofs.length,
    lateWindowDays: 3,
    latePenaltyPercent: 10,
    isPublished: true,
    isLocked: false,
    proofs: cloneProofs(`sandbox-assignment-${index + 1}`, assignment.proofs),
  }
})

export const getInstructorSandboxPractices = () => getSandboxPractices().map((practice, index) => {
  const publishAt = addDays(now, -(index + 3))
  const publish = splitDateTime(publishAt)

  return {
    id: 9131 + index,
    courseId: INSTRUCTOR_SANDBOX_COURSE.id,
    course_id: INSTRUCTOR_SANDBOX_COURSE.id,
    name: practice.title,
    title: practice.title,
    description: practice.description,
    kind: 'practice',
    chapter: practice.chapter,
    subchapter: practice.subchapter,
    publishDate: publish.dueDate,
    publishTime: publish.dueTime,
    dueAt: null,
    due_at: null,
    dueDate: '',
    dueTime: '',
    totalPoints: practice.total_points,
    total_points: practice.total_points,
    questionCount: practice.proofs.length,
    question_count: practice.proofs.length,
    isPublished: true,
    isLocked: false,
    allowRetakes: true,
    showSolutions: true,
    proofs: cloneProofs(`sandbox-practice-${index + 1}`, practice.proofs),
  }
})

const STUDENT_SCORES = [
  [96, 94, 95],
  [95, 93, 92],
  [94, 92, 91],
  [93, 91, 90],
  [92, 90, 89],
  [88, 86, 85],
  [87, 85, 84],
  [86, 84, 83],
  [85, 83, 82],
  [84, 82, 81],
  [78, 76, 75],
  [77, 75, 74],
  [76, 74, 73],
  [67, 65, 63],
  [56, 54, 52],
]

const ATTEMPT_MATRIX = [
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
  [15, 14, 15],
]

const LATE_MATRIX = [
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, false, false],
  [false, true, false],
  [false, false, false],
  [false, false, true],
]

const PRACTICE_ATTEMPT_TOTALS = [8, 11, 10, 9]
const PRACTICE_COMPLETION_TOTALS = [8, 7, 10, 6]

const buildPracticeMatrix = (practiceCount) => (
  Array.from({ length: 15 }, (_, studentIndex) => (
    Array.from({ length: practiceCount }, (_, practiceIndex) => {
      const target = PRACTICE_ATTEMPT_TOTALS[practiceIndex] ?? 0
      const completionTarget = PRACTICE_COMPLETION_TOTALS[practiceIndex] ?? 0
      return {
        attempts: studentIndex < target ? 1 : 0,
        completed: studentIndex < completionTarget,
      }
    })
  ))
)

const PRACTICE_MATRIX = buildPracticeMatrix(getSandboxPractices().length)

export const INSTRUCTOR_SANDBOX_STUDENTS = STUDENT_SCORES.map((scores, index) => {
  const assignments = getInstructorSandboxAssignments()
  const practices = getInstructorSandboxPractices()
  const studentNumber = index + 1

  return {
    id: 9200 + studentNumber,
    username: `student${studentNumber}`,
    role: 'student',
    grades: assignments.reduce((acc, assignment, assignmentIndex) => {
      acc[assignment.id] = scores[assignmentIndex]
      return acc
    }, {}),
    submittedAssignments: assignments.reduce((acc, assignment, assignmentIndex) => {
      const submissionCutoff = [15, 14, 13][assignmentIndex] ?? 13
      acc[assignment.id] = studentNumber <= submissionCutoff
      return acc
    }, {}),
    lateSubmissions: assignments.reduce((acc, assignment, assignmentIndex) => {
      acc[assignment.id] = LATE_MATRIX[index][assignmentIndex]
      return acc
    }, {}),
    submissionDates: assignments.reduce((acc, assignment, assignmentIndex) => {
      acc[assignment.id] = addHours(new Date(assignment.dueAt), -(studentNumber + assignmentIndex))
      return acc
    }, {}),
    attemptCounts: assignments.reduce((acc, assignment, assignmentIndex) => {
      acc[assignment.id] = ATTEMPT_MATRIX[index][assignmentIndex]
      return acc
    }, {}),
    practices: practices.reduce((acc, practice, practiceIndex) => {
      acc[practice.id] = PRACTICE_MATRIX[index][practiceIndex]
      return acc
    }, {}),
  }
})
