/*
 * Shared hook for problem checking logic used across all problem components in the mui folder
 * handles state management, answer validation, checking answers and resetting problems.
 */
import { useState } from 'react'
import { localCheck } from '../lib/logicpenguin/common.js'

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
}) {
  const [status, setStatus] = useState('unanswered')
  const [message, setMessage] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleCheck = async () => {
    if (isChecking || isDisabled()) return
    setIsChecking(true)
    try {
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
      if (result.successstatus === 'correct') {
        setStatus('correct')
        setMessage('Correct!')
        onComplete?.()
      } else {
        setStatus('incorrect')
        setMessage(result.message || result.transmessage || 'Incorrect. Please try again.')
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

  return { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage }
}
