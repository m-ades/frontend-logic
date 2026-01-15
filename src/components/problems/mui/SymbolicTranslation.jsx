import { useState, useEffect, useRef } from 'react'
import { Box, Stack, Typography, Alert } from '@mui/material'
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
  const formulaInputRef = useRef(null)
  const solutionInputRef = useRef(null)
  const hasHydratedRef = useRef(false)
  const legend = problem?.legend || problem?.question_snapshot?.legend

  const FormulaInputField = ({ value, onValueChange, fieldReadOnly, formulaInputRef }) => {
    const containerRef = useRef(null)
    const changeHandlerRef = useRef(null)

    useEffect(() => {
      if (!containerRef.current) return
      if (!formulaInputRef.current) {
        const formulaInput = FormulaInput.getnew({})
        formulaInputRef.current = formulaInput
        formulaInput.style.width = '100%'
        formulaInput.style.padding = theme.spacing(1.5)
        formulaInput.style.border = `1px solid ${theme.palette.divider}`
        formulaInput.style.borderRadius = theme.shape.borderRadius
        formulaInput.style.fontSize = '1rem'
        formulaInput.style.fontFamily = 'monospace'
        formulaInput.style.backgroundColor = theme.palette.background.paper
        formulaInput.style.color = theme.palette.text.primary
        containerRef.current.appendChild(formulaInput)
      }
      return () => {
        if (formulaInputRef.current) {
          if (changeHandlerRef.current) {
            formulaInputRef.current.removeEventListener('input', changeHandlerRef.current)
            formulaInputRef.current.removeEventListener('change', changeHandlerRef.current)
            changeHandlerRef.current = null
          }
          if (formulaInputRef.current.parentNode) {
            formulaInputRef.current.parentNode.removeChild(formulaInputRef.current)
          }
          formulaInputRef.current = null
        }
      }
    }, [formulaInputRef, theme])

    useEffect(() => {
      const formulaInput = formulaInputRef.current
      if (!formulaInput) return
      formulaInput.readOnly = fieldReadOnly
      if (changeHandlerRef.current) {
        formulaInput.removeEventListener('input', changeHandlerRef.current)
        formulaInput.removeEventListener('change', changeHandlerRef.current)
        changeHandlerRef.current = null
      }
      if (!fieldReadOnly) {
        const handleChange = () => {
          if (fieldReadOnly) return
          const nextValue = formulaInput.value
          onValueChange?.(nextValue)
        }
        changeHandlerRef.current = handleChange
        formulaInput.addEventListener('input', handleChange)
        formulaInput.addEventListener('change', handleChange)
      }
      return () => {
        if (changeHandlerRef.current) {
          formulaInput.removeEventListener('input', changeHandlerRef.current)
          formulaInput.removeEventListener('change', changeHandlerRef.current)
          changeHandlerRef.current = null
        }
      }
    }, [fieldReadOnly, onValueChange, formulaInputRef])

    useEffect(() => {
      if (formulaInputRef.current && value !== undefined) {
        formulaInputRef.current.value = value
      }
    }, [value, formulaInputRef])

    return (
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center'
        }}
      />
    )
  }
  
  const { message, isChecking, handleCheck, handleStartOver, getStatusColor, setMessage, isLocked } = useProblemChecker({
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
    onStateChange: (state) => {
      if (state?.ans !== undefined) {
        setInputValue(state.ans)
      }
      onStateChange?.(state)
    },
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })
  const showSolution = isLocked

  useEffect(() => {
    if (hasHydratedRef.current) return
    if (savedState?.ans !== undefined) {
      hasHydratedRef.current = true
      setInputValue(savedState.ans)
    }
  }, [savedState?.ans])


  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            overflow: 'visible',
            minHeight: '150px',
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
          className="lp-problem-card"
        >
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            <Box>
              {legend && (
                <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', whiteSpace: 'pre-line' }}>
                  {legend}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Your translation:
              </Typography>
              <FormulaInputField
                value={inputValue}
                onValueChange={(value) => {
                  if (readOnly) return
                  setInputValue(value)
                }}
                fieldReadOnly={readOnly}
                formulaInputRef={formulaInputRef}
              />
            </Box>
          </Stack>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={getStatusColor()} 
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
          align="flex-start"
        />
      )}
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          <FormulaInputField
            value={answer ?? ''}
            onValueChange={null}
            fieldReadOnly
            formulaInputRef={solutionInputRef}
          />
        </SolutionReveal>
      )}
    </Stack>
  )
}
