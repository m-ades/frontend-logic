/*
 * Shared hook for problem checking logic used across all problem components in the mui folder
 * handles state management, answer validation, checking answers and resetting problems.
 */
import { useState } from 'react'
import { localCheck } from '../lib/logicpenguin/common.js'
import { API_CONFIG, fetchJson } from '../utils/api.js'

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
  attemptLimit = 3,
}) {
  const [status, setStatus] = useState('unanswered')
  const [message, setMessage] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)

  const handleCheck = async () => {
    if (isChecking || isDisabled()) return
    setIsChecking(true)
    try {
      if (assignmentQuestionId) {
        const resp = await fetchJson('/api/validate/submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_question_id: assignmentQuestionId,
            user_id: API_CONFIG.userId,
            submission_data: getAnswer(),
          }),
        })
        const validation = resp?.validation || {}
        const successstatus = validation.successstatus || 'incorrect'
        setAttemptCount((prev) => resp?.submission?.attempt ?? prev + 1)
        if (successstatus === 'correct') {
          setStatus('correct')
          setMessage('Correct!')
          onComplete?.()
        } else {
          setStatus('incorrect')
          setMessage(validation.message || validation.transmessage || 'Incorrect. Please try again.')
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
        setAttemptCount((prev) => Math.min(prev + 1, attemptLimit))
        if (result.successstatus === 'correct') {
          setStatus('correct')
          setMessage('Correct!')
          onComplete?.()
        } else {
          setStatus('incorrect')
          setMessage(result.message || result.transmessage || 'Incorrect. Please try again.')
        }
      }
    } catch (err) {
      setStatus('malfunction')
      setMessage('Error checking answer')
    } finally {
      setIsChecking(false)
    }
  }

  const handleStartOver = () => {
    resetInput()
    setStatus('unanswered')
    setMessage('')
    onStateChange?.({ ans: undefined })
  }

  const getStatusColor = () => {
    switch (status) {
      case 'correct': return 'success'
      case 'incorrect': return 'error'
      case 'checking': return 'info'
      default: return 'default'
    }
  }

  return { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, attemptCount }
}
