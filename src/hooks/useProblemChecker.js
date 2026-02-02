/*
 * Shared hook for problem checking logic used across all problem components in the mui folder
 * handles state management, answer validation, checking answers and resetting problems.
 */
import { useState } from 'react'
import { localCheck } from '../lib/logicpenguin/common.js'
import { fetchJson, getActiveUserId } from '../utils/api.js'
import { getSubmissionScore } from '../utils/problemHelpers.js'

export function useProblemChecker({
  answer,
  problemType,
  question,
  options,
  getAnswer,
  onComplete,
  isDisabled,
  resetInput,
  onStateChange,
  assignmentQuestionId,
  attemptLimit = 10,
  initialAttemptCount = 0,
}) {
  const [status, setStatus] = useState('unanswered')
  const [message, setMessage] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount)
  const [maxAttempts, setMaxAttempts] = useState(attemptLimit)
  const isLocked = attemptCount >= maxAttempts

  const handleCheck = async () => {
    if (isChecking || isDisabled() || isLocked) return
    setIsChecking(true)
    try {
      if (assignmentQuestionId) {
        const resp = await fetchJson('/api/validate/submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_question_id: assignmentQuestionId,
            user_id: getActiveUserId(),
            submission_data: getAnswer(),
          }),
        })
        const validation = resp?.validation || {}
        const successstatus = validation.successstatus || 'incorrect'
        if (typeof resp?.attempt_limit === 'number') {
          setMaxAttempts(resp.attempt_limit)
        }
        setAttemptCount((prev) => resp?.submission?.attempt ?? prev + 1)
        if (typeof window !== 'undefined') {
          const score = getSubmissionScore(resp)
          window.dispatchEvent(new CustomEvent('assignment-submission', {
            detail: {
              assignmentQuestionId,
              attempt: resp?.submission?.attempt,
              attemptLimit: resp?.attempt_limit,
              isCorrect: successstatus === 'correct',
              score,
            },
          }))
        }
        if (successstatus === 'correct') {
          setStatus('correct')
          setMessage('Correct!')
          onComplete?.()
        } else if (successstatus === 'partial') {
          setStatus('partial')
          setMessage(validation.message || validation.transmessage || 'Partially correct.')
        } else {
          setStatus('incorrect')
          setMessage(validation.message || validation.transmessage || 'Incorrect.')
        }
      } else {
        const result = await localCheck({
          myanswer: answer,
          myproblemtype: problemType,
          myquestion: question,
          options,
          getAnswer,
          getIndicatorStatus: () => ({ savestatus: 'unsaved' }),
          setIndicator: () => {},
        })
        if (!result || !result.successstatus) {
          setStatus('malfunction')
          setMessage('Error checking answer')
          return
        }
        setAttemptCount((prev) => Math.min(prev + 1, maxAttempts))
        if (result.successstatus === 'correct') {
          setStatus('correct')
          setMessage('Correct!')
          onComplete?.()
        } else if (result.successstatus === 'partial') {
          setStatus('partial')
          setMessage(result.message || result.transmessage || 'Partially correct.')
        } else {
          setStatus('incorrect')
          setMessage(result.message || result.transmessage || 'Incorrect.')
        }
      }
    } catch (err) {
      const errText = String(err || '')
      if (errText.includes('Attempt limit exceeded')) {
        setAttemptCount((prev) => Math.max(prev, maxAttempts))
        setStatus('incorrect')
        setMessage('Attempt limit reached.')
      } else {
        setStatus('malfunction')
        setMessage('Error checking answer')
      }
    } finally {
      setIsChecking(false)
    }
  }

  const handleStartOver = () => {
    if (isLocked) return
    resetInput()
    setStatus('unanswered')
    setMessage('')
    onStateChange?.({ ans: undefined })
  }

  const getStatusColor = () => {
    switch (status) {
      case 'correct': return 'success'
      case 'incorrect': return 'error'
      case 'malfunction': return 'warning'
      case 'checking': return 'info'
      default: return 'info'
    }
  }

  return { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, attemptCount, maxAttempts, isLocked }
}
