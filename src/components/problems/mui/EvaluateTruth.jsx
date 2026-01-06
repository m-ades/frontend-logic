import { useState, useEffect } from 'react'
import { Box, Radio, RadioGroup, FormControlLabel, FormControl, Typography, Alert } from '@mui/material'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'

export default function EvaluateTruth({ 
  problem, 
  answer, 
  onStateChange, 
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  readOnly = false,
  hideActions = false,
}) {
  const [selectedValue, setSelectedValue] = useState(
    savedState?.ans !== undefined ? (savedState.ans ? 'true' : 'false') : ''
  )
  
  const { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, isLocked } = useProblemChecker({
    answer,
    problemType: 'evaluate-truth',
    question: problem,
    getAnswer: () => selectedValue === 'true',
    onComplete,
    isDisabled: () => selectedValue === '',
    resetInput: () => setSelectedValue(''),
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  useEffect(() => {
    if (readOnly) return
    if (selectedValue !== '') {
      onStateChange?.({ ans: selectedValue === 'true' })
    }
  }, [readOnly, selectedValue, onStateChange])

  const handleChange = (event) => {
    if (readOnly) return
    setSelectedValue(event.target.value)
    setStatus('unanswered')
    setMessage('')
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto' }}>
      <Typography 
        variant="body1" 
        sx={{ 
          mb: 3, 
          fontWeight: 500,
          fontFamily: 'monospace',
          fontSize: '1.1rem',
          textAlign: 'center'
        }}
      >
        {problem}
      </Typography>

      <FormControl component="fieldset" sx={{ width: '100%', mb: 2 }}>
        <RadioGroup
          value={selectedValue}
          onChange={handleChange}
          name="evaluate-truth"
        >
          <FormControlLabel
            value="true"
            control={<Radio disabled={readOnly} />}
            label="True"
            sx={{
              mb: 1,
              '& .MuiFormControlLabel-label': {
                fontSize: '1rem'
              }
            }}
          />
          <FormControlLabel
            value="false"
            control={<Radio disabled={readOnly} />}
            label="False"
            sx={{
              '& .MuiFormControlLabel-label': {
                fontSize: '1rem'
              }
            }}
          />
        </RadioGroup>
      </FormControl>

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
          isDisabled={selectedValue === '' || isLocked}
        />
      )}
    </Box>
  )
}
