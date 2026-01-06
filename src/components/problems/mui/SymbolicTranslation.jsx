import { useState, useEffect, useRef } from 'react'
import { Box, Typography, Alert } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import FormulaInput from '../../ui/logicpenguin/formula-input.js'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'

export default function SymbolicTranslation({ 
  problem, 
  answer, 
  onStateChange, 
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  readOnly = false,
  hideActions = false,
  suppressReveal = false,
}) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState(savedState?.ans || '')

  const FormulaInputField = ({ value, onValueChange, fieldReadOnly }) => {
    const inputRef = useRef(null)
    const formulaInputRef = useRef(null)

    useEffect(() => {
      if (!inputRef.current || formulaInputRef.current) return
      const formulaInput = FormulaInput.getnew({})
      formulaInput.readOnly = fieldReadOnly
      formulaInputRef.current = formulaInput

      formulaInput.style.width = '100%'
      formulaInput.style.padding = theme.spacing(1.5)
      formulaInput.style.border = `1px solid ${theme.palette.divider}`
      formulaInput.style.borderRadius = theme.shape.borderRadius
      formulaInput.style.fontSize = '1rem'
      formulaInput.style.fontFamily = 'monospace'
      formulaInput.style.backgroundColor = theme.palette.background.paper
      formulaInput.style.color = theme.palette.text.primary

      inputRef.current.appendChild(formulaInput)

      const handleChange = () => {
        if (fieldReadOnly) return
        const nextValue = formulaInput.value
        onValueChange?.(nextValue)
      }

      if (!fieldReadOnly) {
        formulaInput.addEventListener('input', handleChange)
        formulaInput.addEventListener('change', handleChange)
      }

      return () => {
        if (formulaInputRef.current) {
          if (!fieldReadOnly) {
            formulaInput.removeEventListener('input', handleChange)
            formulaInput.removeEventListener('change', handleChange)
          }
          if (formulaInput.parentNode) {
            formulaInput.parentNode.removeChild(formulaInput)
          }
          formulaInputRef.current = null
        }
      }
    }, [fieldReadOnly, onValueChange])

    useEffect(() => {
      if (formulaInputRef.current && value !== undefined) {
        formulaInputRef.current.value = value
      }
    }, [value])

    return (
      <Box
        ref={inputRef}
        sx={{
          width: '100%',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center'
        }}
      />
    )
  }
  
  const { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer,
    problemType: 'symbolic-translation',
    question: problem,
    getAnswer: () => inputValue,
    onComplete,
    isDisabled: () => !inputValue.trim(),
    resetInput: () => {
      setInputValue('')
      if (formulaInputRef.current) {
        formulaInputRef.current.value = ''
      }
    },
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })
  const showSolution = isLocked

  useEffect(() => {
    if (savedState?.ans !== undefined) {
      setInputValue(savedState.ans)
    }
  }, [savedState?.ans])


  return (
    <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, textAlign: 'center' }}>
        {problem}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          Your translation:
        </Typography>
        <FormulaInputField
          value={inputValue}
          onValueChange={(value) => {
            if (readOnly) return
            setInputValue(value)
            onStateChange?.({ ans: value })
          }}
          fieldReadOnly={readOnly}
        />
      </Box>

      {message && (
        <Alert 
          severity={getStatusColor()} 
          sx={{ mb: 2 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      {!hideActions && (
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={!inputValue.trim() || isLocked}
        />
      )}
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          <FormulaInputField
            value={answer ?? ''}
            onValueChange={null}
            fieldReadOnly
          />
        </SolutionReveal>
      )}
    </Box>
  )
}
