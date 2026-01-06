import { useState, useEffect } from 'react'
import { Box, Radio, RadioGroup, FormControlLabel, FormControl, Typography, Alert } from '@mui/material'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'

export default function MultipleChoice({ 
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
  const [selectedValue, setSelectedValue] = useState(savedState?.ans !== undefined ? String(savedState.ans) : '')
  
  const { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer,
    problemType: 'multiple-choice',
    question: problem,
    getAnswer: () => parseInt(selectedValue),
    onComplete,
    isDisabled: () => selectedValue === '',
    resetInput: () => setSelectedValue(''),
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })
  const showSolution = isLocked && typeof answer === 'number'

  useEffect(() => {
    if (readOnly) return
    if (selectedValue !== '') {
      onStateChange?.({ ans: parseInt(selectedValue) })
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
          name="multiple-choice"
        >
          {problem.choices.map((choice, index) => (
            <FormControlLabel
              key={index}
              value={String(index)}
              control={<Radio disabled={readOnly} />}
              label={choice}
              sx={{
                mb: 1,
                '& .MuiFormControlLabel-label': {
                  fontSize: '1rem'
                }
              }}
            />
          ))}
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
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          <FormControl component="fieldset" sx={{ width: '100%', mb: 2 }}>
            <RadioGroup value={String(answer ?? '')} name="multiple-choice-reveal">
              {problem.choices.map((choice, index) => (
                <FormControlLabel
                  key={`${choice}-${index}`}
                  value={String(index)}
                  control={<Radio disabled />}
                  label={choice}
                  sx={{
                    mb: 1,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '1rem'
                    }
                  }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </SolutionReveal>
      )}
    </Box>
  )
}
