import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterOrganizedSubmissions,
  organizeAssignmentSubmissions,
} from '../src/utils/assignmentSubmissions.js'

const row = (overrides) => ({
  id: 1,
  assignment_question_id: 10,
  user_id: 1,
  attempt: 1,
  score: 0,
  is_correct: false,
  auto_submitted: false,
  submitted_at: '2026-09-01T12:00:00Z',
  User: { id: 1, username: 'adam' },
  AssignmentQuestion: { id: 10, order_index: 0, points_value: 100 },
  ...overrides,
})

const rows = [
  // adam: question 10 attempted twice (latest is correct), question 11 once
  row({ id: 1, attempt: 1, score: 40, submitted_at: '2026-09-01T12:00:00Z' }),
  row({ id: 2, attempt: 2, score: 100, is_correct: true, submitted_at: '2026-09-02T12:00:00Z' }),
  row({
    id: 3, assignment_question_id: 11, score: 50, submitted_at: '2026-09-03T09:00:00Z',
    AssignmentQuestion: { id: 11, order_index: 1, points_value: 100 },
  }),
  // zoe: question 11 only, more recent than adam
  row({
    id: 4, user_id: 2, assignment_question_id: 11, score: 100, is_correct: true,
    submitted_at: '2026-09-04T09:00:00Z', User: { id: 2, username: 'zoe' },
    AssignmentQuestion: { id: 11, order_index: 1, points_value: 100 },
  }),
]

test('groups by student with latest attempt first and prior attempts as history', () => {
  const { byStudent, summary } = organizeAssignmentSubmissions(rows)

  assert.deepEqual(byStudent.map((s) => s.username), ['zoe', 'adam'])
  const adam = byStudent[1]
  assert.equal(adam.questionCount, 2)
  assert.equal(adam.attemptCount, 3)
  assert.equal(adam.correctCount, 1)
  assert.equal(adam.averageLatestScore, 75)
  assert.deepEqual(adam.questions.map((q) => q.label), ['Problem 1', 'Problem 2'])

  const q10 = adam.questions[0]
  assert.equal(q10.latest.id, 2)
  assert.deepEqual(q10.history.map((h) => h.id), [1])
  assert.equal(q10.bestScore, 100)

  assert.deepEqual(summary, {
    submissionCount: 4,
    studentCount: 2,
    questionCount: 2,
    latestSubmittedAt: Date.parse('2026-09-04T09:00:00Z'),
  })
})

test('groups by question in order_index order with students sorted by name', () => {
  const { byQuestion } = organizeAssignmentSubmissions(rows)

  assert.deepEqual(byQuestion.map((q) => q.label), ['Problem 1', 'Problem 2'])
  const q11 = byQuestion[1]
  assert.deepEqual(q11.students.map((s) => s.username), ['adam', 'zoe'])
  assert.equal(q11.studentCount, 2)
  assert.equal(q11.correctCount, 1)
  assert.equal(q11.averageLatestScore, 75)
})

test('skips rows without a user or question and falls back to a generic label', () => {
  const { byStudent, byQuestion } = organizeAssignmentSubmissions([
    row({ user_id: null }),
    row({ assignment_question_id: null, AssignmentQuestion: null }),
    row({ id: 9, assignment_question_id: 42, AssignmentQuestion: null, User: null }),
  ])

  assert.equal(byStudent.length, 1)
  assert.equal(byStudent[0].username, 'User 1')
  assert.equal(byQuestion[0].label, 'Question 42')
})

test('handles empty and non-array input', () => {
  for (const input of [[], undefined, null, 'nope']) {
    const { byStudent, byQuestion, summary } = organizeAssignmentSubmissions(input)
    assert.deepEqual(byStudent, [])
    assert.deepEqual(byQuestion, [])
    assert.equal(summary.submissionCount, 0)
    assert.equal(summary.latestSubmittedAt, null)
  }
})

test('filters both groupings by username and recomputes the summary', () => {
  const organized = organizeAssignmentSubmissions(rows)
  const filtered = filterOrganizedSubmissions(organized, '  ZO ')

  assert.deepEqual(filtered.byStudent.map((s) => s.username), ['zoe'])
  assert.deepEqual(filtered.byQuestion.map((q) => q.label), ['Problem 2'])
  assert.equal(filtered.byQuestion[0].studentCount, 1)
  assert.equal(filtered.byQuestion[0].averageLatestScore, 100)
  assert.deepEqual(filtered.summary, {
    submissionCount: 1,
    studentCount: 1,
    questionCount: 1,
    latestSubmittedAt: organized.summary.latestSubmittedAt,
  })
})

test('an empty query returns the organized data unchanged', () => {
  const organized = organizeAssignmentSubmissions(rows)
  assert.equal(filterOrganizedSubmissions(organized, ''), organized)
  assert.equal(filterOrganizedSubmissions(organized, undefined), organized)
})

test('numbers problems by position in the full question list, not order_index + 1', () => {
  // order_index starts at 1 here
  const questions = [
    { id: 20, order_index: 1, points_value: 100 },
    { id: 21, order_index: 2, points_value: 100 },
  ]
  const oneBasedRows = [
    row({
      id: 5, assignment_question_id: 20, submitted_at: '2026-09-05T09:00:00Z',
      AssignmentQuestion: { id: 20, order_index: 1, points_value: 100 },
    }),
    row({
      id: 6, assignment_question_id: 21, submitted_at: '2026-09-05T10:00:00Z',
      AssignmentQuestion: { id: 21, order_index: 2, points_value: 100 },
    }),
  ]

  const { byQuestion } = organizeAssignmentSubmissions(oneBasedRows, questions)
  assert.deepEqual(byQuestion.map((q) => q.label), ['Problem 1', 'Problem 2'])
})

test('numbers problems by position even when order_index has gaps from a deleted question', () => {
  const questions = [
    { id: 30, order_index: 0, points_value: 100 },
    { id: 31, order_index: 5, points_value: 100 }, // order_index 1-4 deleted
  ]
  const gappedRows = [
    row({
      id: 7, assignment_question_id: 30, submitted_at: '2026-09-06T09:00:00Z',
      AssignmentQuestion: { id: 30, order_index: 0, points_value: 100 },
    }),
    row({
      id: 8, assignment_question_id: 31, submitted_at: '2026-09-06T10:00:00Z',
      AssignmentQuestion: { id: 31, order_index: 5, points_value: 100 },
    }),
  ]

  const { byQuestion } = organizeAssignmentSubmissions(gappedRows, questions)
  assert.deepEqual(byQuestion.map((q) => q.label), ['Problem 1', 'Problem 2'])
})

test('includes questions nobody has submitted yet, using the full question list', () => {
  const questions = [
    { id: 40, order_index: 0, points_value: 100 },
    { id: 41, order_index: 1, points_value: 100 }, // nobody has attempted this one
    { id: 42, order_index: 2, points_value: 100 },
  ]
  const partialRows = [
    row({
      id: 9, assignment_question_id: 40, submitted_at: '2026-09-07T09:00:00Z',
      AssignmentQuestion: { id: 40, order_index: 0, points_value: 100 },
    }),
    row({
      id: 10, assignment_question_id: 42, submitted_at: '2026-09-07T10:00:00Z',
      AssignmentQuestion: { id: 42, order_index: 2, points_value: 100 },
    }),
  ]

  const { byQuestion, summary } = organizeAssignmentSubmissions(partialRows, questions)
  assert.deepEqual(byQuestion.map((q) => q.label), ['Problem 1', 'Problem 2', 'Problem 3'])
  const untouched = byQuestion[1]
  assert.equal(untouched.questionId, 41)
  assert.equal(untouched.studentCount, 0)
  assert.deepEqual(untouched.students, [])
  assert.equal(untouched.averageLatestScore, null)
  assert.equal(summary.questionCount, 3)
})
