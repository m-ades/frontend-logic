import { useState, useEffect } from 'react'
import { Box, Radio, RadioGroup, FormControlLabel, FormControl, Typography, Alert } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'

export default function MultipleChoice({ 
  problem, 
  answer, 
  onStateChange, 
  onComplete,
  savedState 
}) {
  const theme = useTheme()
  const [selectedValue, setSelectedValue] = useState(savedState?.ans !== undefined ? String(savedState.ans) : '')
  
  const { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage } = useProblemChecker({
    answer,
    problemType: 'multiple-choice',
    question: problem,
    getAnswer: () => parseInt(selectedValue),
    onComplete,
    isDisabled: () => selectedValue === '',
    resetInput: () => setSelectedValue(''),
    onStateChange
  })

  useEffect(() => {
    if (selectedValue !== '') {
      onStateChange?.({ ans: parseInt(selectedValue) })
    }
  }, [selectedValue, onStateChange])

  const handleChange = (event) => {
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
              control={<Radio />}
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

      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={selectedValue === ''}
      />
    </Box>
  )
}
