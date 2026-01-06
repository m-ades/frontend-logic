import { useState, useEffect } from 'react'
import { Box, Radio, RadioGroup, FormControlLabel, FormControl, Typography, Alert, Paper, Table, TableBody, TableRow, TableCell } from '@mui/material'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'

export default function ValidCorrectSound({ 
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
  const [answers, setAnswers] = useState({
    correct: savedState?.ans?.correct !== undefined ? String(savedState.ans.correct) : '',
    valid: savedState?.ans?.valid !== undefined ? String(savedState.ans.valid) : '',
    sound: savedState?.ans?.sound !== undefined ? String(savedState.ans.sound) : ''
  })
  
  const { status, message, isChecking, handleCheck: baseHandleCheck, handleStartOver, getStatusColor, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer,
    problemType: 'valid-correct-sound',
    question: problem,
    getAnswer: () => ({
      correct: answers.correct === '' ? -2 : (answers.correct === 'true' ? true : false),
      valid: answers.valid === '' ? -2 : (answers.valid === 'true' ? true : false),
      sound: answers.sound === '' ? -2 : (answers.sound === 'true' ? true : false)
    }),
    onComplete,
    isDisabled: () => false, // Custom validation in handleCheck
    resetInput: () => setAnswers({ correct: '', valid: '', sound: '' }),
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })
  const showSolution = isLocked
  
  const handleCheck = async () => {
    const ans = {
      correct: answers.correct === '' ? -2 : (answers.correct === 'true' ? true : false),
      valid: answers.valid === '' ? -2 : (answers.valid === 'true' ? true : false),
      sound: answers.sound === '' ? -2 : (answers.sound === 'true' ? true : false)
    }
    if (ans.correct === -2 || ans.valid === -2 || ans.sound === -2) {
      setMessage('Please answer all questions')
      return
    }
    await baseHandleCheck()
  }

  useEffect(() => {
    if (readOnly) return
    if (Object.values(answers).some(v => v !== '')) {
      const ans = {
        correct: answers.correct === '' ? -2 : (answers.correct === 'true' ? true : false),
        valid: answers.valid === '' ? -2 : (answers.valid === 'true' ? true : false),
        sound: answers.sound === '' ? -2 : (answers.sound === 'true' ? true : false)
      }
      onStateChange?.({ ans })
    }
  }, [readOnly, answers, onStateChange])

  const handleChange = (question, value) => {
    if (readOnly) return
    setAnswers(prev => ({ ...prev, [question]: value }))
    setStatus('unanswered')
    setMessage('')
  }

  const renderAnswerTable = (values, tableReadOnly) => (
    <Table sx={{ mb: 2 }}>
      <TableBody>
        {['correct', 'valid', 'sound'].map((q) => (
          <TableRow key={q}>
            <TableCell sx={{ border: 'none', py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {q === 'correct' ? 'Factually correct?' : q === 'valid' ? 'Valid?' : 'Sound?'}
              </Typography>
            </TableCell>
            <TableCell sx={{ border: 'none', py: 1 }}>
              <RadioGroup
                row
                value={values[q]}
                onChange={(e) => handleChange(q, e.target.value)}
                name={q}
              >
                <FormControlLabel value="true" control={<Radio size="small" disabled={tableReadOnly} />} label="Yes" />
                <FormControlLabel value="false" control={<Radio size="small" disabled={tableReadOnly} />} label="No" />
              </RadioGroup>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const isComplete = answers.correct !== '' && answers.valid !== '' && answers.sound !== ''

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto' }}>
      <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Premises:</Typography>
        {problem.prems.map((prem, idx) => (
          <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
            {idx + 1}. {prem}
          </Typography>
        ))}
        <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>Conclusion:</Typography>
        <Typography variant="body2">{problem.conc}</Typography>
      </Paper>

      {renderAnswerTable(answers, readOnly)}

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
          isDisabled={!isComplete || isLocked}
        />
      )}
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          {renderAnswerTable({
            correct: answer?.correct === true ? 'true' : answer?.correct === false ? 'false' : '',
            valid: answer?.valid === true ? 'true' : answer?.valid === false ? 'false' : '',
            sound: answer?.sound === true ? 'true' : answer?.sound === false ? 'false' : '',
          }, true)}
        </SolutionReveal>
      )}
    </Box>
  )
}
