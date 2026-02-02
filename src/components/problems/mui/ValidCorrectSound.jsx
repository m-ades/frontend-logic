/*
import { useState, useEffect } from 'react'
import { Box, Stack, Radio, RadioGroup, FormControlLabel, FormControl, Typography, Table, TableBody, TableRow, TableCell } from '@mui/material'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
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

  const buildAnswerPayload = (values) => ({
    correct: values.correct === '' ? -2 : (values.correct === 'true' ? true : false),
    valid: values.valid === '' ? -2 : (values.valid === 'true' ? true : false),
    sound: values.sound === '' ? -2 : (values.sound === 'true' ? true : false)
  })
  const hasAnyAnswer = (values) => Object.values(values).some((value) => value !== '')
  
  const { status, message, isChecking, handleCheck: baseHandleCheck, handleStartOver, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
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
  const showSolution = isLocked && status !== 'correct'
  
  const handleCheck = async () => {
    const ans = buildAnswerPayload(answers)
    if (ans.correct === -2 || ans.valid === -2 || ans.sound === -2) {
      setStatus('unanswered')
      setMessage('Please answer all questions')
      return
    }
    await baseHandleCheck()
  }

  useEffect(() => {
    if (savedState?.ans) {
      setAnswers({
        correct: savedState.ans.correct !== undefined ? String(savedState.ans.correct) : '',
        valid: savedState.ans.valid !== undefined ? String(savedState.ans.valid) : '',
        sound: savedState.ans.sound !== undefined ? String(savedState.ans.sound) : ''
      })
      return
    }
    setAnswers({ correct: '', valid: '', sound: '' })
  }, [savedState?.ans?.correct, savedState?.ans?.sound, savedState?.ans?.valid])

  const handleChange = (question, value) => {
    if (readOnly) return
    setAnswers((prev) => {
      const nextAnswers = { ...prev, [question]: value }
      if (hasAnyAnswer(nextAnswers)) {
        onStateChange?.({ ans: buildAnswerPayload(nextAnswers) })
      }
      return nextAnswers
    })
    setStatus('unanswered')
    setMessage('')
  }

  const renderAnswerTable = (values, tableReadOnly) => (
    <Table>
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
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            overflow: 'visible',
            minHeight: '250px',
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
          className="lp-problem-card"
        >
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Premises:</Typography>
              {problem.prems.map((prem, idx) => (
                <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                  {idx + 1}. {prem}
                </Typography>
              ))}
              <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>Conclusion:</Typography>
              <Typography variant="body2">{problem.conc}</Typography>
            </Box>
            {renderAnswerTable(answers, readOnly)}
          </Stack>
        </Box>
      </Box>

      {isTerminalStatus(status) && (
        <StatusBanner
          status={status}
          message={message}
          onClose={() => setMessage('')}
        />
      )}

      {!hideActions && (
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={!isComplete || isLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
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
    </Stack>
  )
}
*/
