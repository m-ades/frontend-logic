import { fetchJson, getActiveUserId } from './api.js'
import { getSubmissionScore } from './problemHelpers.js'

export const isSandboxRuntime = () => (
  typeof window !== 'undefined' && window.location.pathname.startsWith('/sandbox')
)

export const shouldUseApiValidation = (assignmentQuestionId) => (
  Boolean(assignmentQuestionId) && !isSandboxRuntime()
)

export const persistableAnswerState = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  return { ans: value }
}

export const buildPersistedSubmissionState = ({
  answerState,
  attemptCount,
  status,
  rawScore,
}) => ({
  ...persistableAnswerState(answerState),
  attemptCount,
  lastSubmissionAt: Date.now(),
  lastStatus: status,
  rawScore,
})

export async function submitApiValidation({ assignmentQuestionId, submissionData }) {
  const response = await fetchJson('/api/validate/submission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignment_question_id: assignmentQuestionId,
      user_id: getActiveUserId(),
      submission_data: submissionData,
    }),
  })
  const validation = response?.validation || {}
  const successstatus = validation.successstatus || 'incorrect'
  const score = getSubmissionScore(response)

  return {
    response,
    validation,
    successstatus,
    rawScore: score != null ? score : (successstatus === 'correct' ? 100 : 0),
    attempt: response?.submission?.attempt ?? null,
    attemptLimit: response?.attempt_limit,
  }
}
