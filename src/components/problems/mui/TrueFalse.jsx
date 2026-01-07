import { useState, useEffect } from 'react'
import { Box, Radio, RadioGroup, FormControlLabel, FormControl, Typography, Alert } from '@mui/material'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'

export default function TrueFalse({ 
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
    problemType: 'true-false',
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
  const showSolution = isLocked && typeof answer === 'boolean'

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
      <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, textAlign: 'center' }}>
        {problem.prompt}
      </Typography>

      <FormControl component="fieldset" sx={{ width: '100%', mb: 2 }}>
        <RadioGroup
          value={selectedValue}
          onChange={handleChange}
          name="true-false"
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
      <SolutionReveal show={showSolution}>
        <FormControl component="fieldset" sx={{ width: '100%', mb: 2 }}>
          <RadioGroup value={answer ? 'true' : 'false'} name="true-false-reveal">
            <FormControlLabel value="true" control={<Radio disabled />} label="True" />
            <FormControlLabel value="false" control={<Radio disabled />} label="False" />
          </RadioGroup>
        </FormControl>
      </SolutionReveal>
    </Box>
  )
}
