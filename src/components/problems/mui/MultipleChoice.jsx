import { useState, useEffect } from 'react'
import { Box, Stack, Radio, RadioGroup, FormControlLabel, FormControl, Alert } from '@mui/material'
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
  
  const { message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, isLocked } = useProblemChecker({
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
    if (savedState?.ans === undefined) {
      setSelectedValue('')
      return
    }
    setSelectedValue(String(savedState.ans))
  }, [savedState?.ans])

  const handleChange = (event) => {
    if (readOnly) return
    const nextValue = event.target.value
    setSelectedValue(nextValue)
    onStateChange?.({ ans: parseInt(nextValue) })
    setStatus('unanswered')
    setMessage('')
  }

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            overflow: 'visible',
            minHeight: '200px',
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
          className="lp-problem-card"
        >
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            <FormControl component="fieldset" sx={{ width: '100%' }}>
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
          isDisabled={selectedValue === '' || isLocked}
          align="flex-start"
        />
      )}
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
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
    </Stack>
  )
}
