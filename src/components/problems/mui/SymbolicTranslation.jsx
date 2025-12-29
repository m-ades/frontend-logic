import { useState, useEffect, useRef } from 'react'
import { Box, TextField, Typography, Alert } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import FormulaInput from '../../ui/logicpenguin/formula-input.js'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'

export default function SymbolicTranslation({ 
  problem, 
  answer, 
  onStateChange, 
  onComplete,
  savedState 
}) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState(savedState?.ans || '')
  const inputRef = useRef(null)
  const formulaInputRef = useRef(null)
  
  const { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage } = useProblemChecker({
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
    onStateChange
  })

  useEffect(() => { // only runs once on mount
    if (inputRef.current && !formulaInputRef.current) {
      const formulaInput = FormulaInput.getnew({})
      formulaInputRef.current = formulaInput
      
      // mui stylinbg of logicpenguin's formula input
      formulaInput.style.width = '100%'
      formulaInput.style.padding = theme.spacing(1.5)
      formulaInput.style.border = `1px solid ${theme.palette.divider}`
      formulaInput.style.borderRadius = theme.shape.borderRadius
      formulaInput.style.fontSize = '1rem'
      formulaInput.style.fontFamily = 'monospace'
      formulaInput.style.backgroundColor = theme.palette.background.paper
      formulaInput.style.color = theme.palette.text.primary
      
      inputRef.current.appendChild(formulaInput)
      
      if (savedState?.ans) {
        formulaInput.value = savedState.ans

        setInputValue(savedState.ans)
      }

      const handleChange = () => {
        const value = formulaInput.value
        setInputValue(value)
        onStateChange?.({ ans: value })
      }

      const handleFocus = () => {
        formulaInput.style.borderColor = theme.palette.primary.main
        formulaInput.style.boxShadow = `0 0 0 2px ${theme.palette.primary.main}20`
      }

      const handleBlur = () => {
        formulaInput.style.borderColor = theme.palette.divider
        formulaInput.style.boxShadow = 'none'
      }

      formulaInput.addEventListener('input', handleChange)
      formulaInput.addEventListener('change', handleChange)
      formulaInput.addEventListener('focus', handleFocus)
      formulaInput.addEventListener('blur', handleBlur)

      return () => {
        if (formulaInputRef.current) {
          formulaInput.removeEventListener('input', handleChange)
          formulaInput.removeEventListener('change', handleChange)
          formulaInput.removeEventListener('focus', handleFocus)
          formulaInput.removeEventListener('blur', handleBlur)
          if (formulaInput.parentNode) {
            formulaInput.parentNode.removeChild(formulaInput)
          }
          formulaInputRef.current = null
        }
      }
    }
  }, []) 

  // syncs formula input value when savedState.ans changes from user input or navigating back
  useEffect(() => {
    if (formulaInputRef.current && savedState?.ans !== undefined && formulaInputRef.current.value !== savedState.ans) {
      formulaInputRef.current.value = savedState.ans
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
        <Box 
          ref={inputRef} 
          sx={{ 
            width: '100%',
            minHeight: '56px', // adjust space for input during testing
            display: 'flex',
            alignItems: 'center'
          }} 
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

      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={!inputValue.trim()}
      />
    </Box>
  )
}
