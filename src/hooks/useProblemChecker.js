/*
 * Shared hook for problem checking logic used across all problem components in the mui folder
 * handles state management, answer validation, checking answers and resetting problems.
 */
import { useState, useEffect } from 'react'
import { localCheck } from '../lib/logicpenguin/common.js'
import { componentScorePercent } from '../lib/logicpenguin/component-grading.js'
import { buildPersistedSubmissionState, shouldUseApiValidation, submitApiValidation } from '../utils/submissionRuntime.js'

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
  const useApiValidation = shouldUseApiValidation(assignmentQuestionId)

  // Sync from parent (e.g. after refreshQuestionSolutions) but never decrease count:
  // a submission response may have already set a higher value before parent state updates.
  useEffect(() => {
    if (typeof initialAttemptCount === 'number') {
      setAttemptCount((prev) => Math.max(prev, initialAttemptCount))
    }
  }, [initialAttemptCount])
  useEffect(() => {
    if (typeof attemptLimit === 'number') {
      setMaxAttempts(attemptLimit)
    }
  }, [attemptLimit])

  const handleCheck = async () => {
    if (isChecking || isDisabled() || isLocked) return
    setIsChecking(true)
    try {
      if (useApiValidation) {
        const submission = await submitApiValidation({
          assignmentQuestionId,
          submissionData: getAnswer(),
        })
        const { response, validation, successstatus, rawScore, attempt, attemptLimit: nextAttemptLimit } = submission
        if (typeof nextAttemptLimit === 'number') {
          setMaxAttempts(nextAttemptLimit)
        }
        const nextAttempt = attempt ?? attemptCount + 1
        setAttemptCount((prev) => attempt ?? prev + 1)
        onStateChange?.(buildPersistedSubmissionState({
          answerState: getAnswer(),
          attemptCount: nextAttempt,
          status: successstatus,
          rawScore,
        }))
        if (typeof window !== 'undefined') {
          const score = rawScore
          window.dispatchEvent(new CustomEvent('assignment-submission', {
            detail: {
              assignmentQuestionId,
              attempt,
              attemptLimit: nextAttemptLimit,
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
        const partialScore = componentScorePercent(result.componentScores)
        const rawScore = result.successstatus === 'correct'
          ? 100
          : result.successstatus === 'partial'
            ? (partialScore ?? 50)
            : 0
        const nextAttempt = Math.min(attemptCount + 1, maxAttempts)
        setAttemptCount((prev) => Math.min(prev + 1, maxAttempts))
        onStateChange?.(buildPersistedSubmissionState({
          answerState: getAnswer(),
          attemptCount: nextAttempt,
          status: result.successstatus,
          rawScore,
        }))
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
