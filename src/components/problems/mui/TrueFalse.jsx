import { useState, useEffect, useId } from 'react'
import { Box, Stack, Radio, RadioGroup, FormControlLabel, FormControl } from '@mui/material'
import StatusBanner from '../../ui/StatusBanner.jsx'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'
import PromptText from '../../ui/PromptText.jsx'

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
  const prompt = problem?.prompt || ''
  const [selectedValue, setSelectedValue] = useState(
    savedState?.ans !== undefined ? (savedState.ans ? 'true' : 'false') : ''
  )
  const baseId = useId()
  const groupName = assignmentQuestionId
    ? `true-false-${assignmentQuestionId}`
    : `true-false-${baseId}`
  
  const { status, message, isChecking, handleCheck, handleStartOver, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
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
  const showSolution = isLocked && status !== 'correct' && typeof answer === 'boolean'

  useEffect(() => {
    if (savedState?.ans === undefined) {
      setSelectedValue('')
      return
    }
    setSelectedValue(savedState.ans ? 'true' : 'false')
  }, [savedState?.ans])

  const handleChange = (event) => {
    if (readOnly) return
    const nextValue = event.target.value
    setSelectedValue(nextValue)
    onStateChange?.({ ans: nextValue === 'true' })
    setStatus('unanswered')
    setMessage('')
  }

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
            {prompt && (
              <PromptText content={prompt} />
            )}
            <FormControl component="fieldset" sx={{ width: '100%' }}>
              <RadioGroup
                value={selectedValue}
                onChange={handleChange}
                name={groupName}
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
            {/* show answer in card */}
            <SolutionReveal show={showSolution}>
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <RadioGroup value={answer ? 'true' : 'false'} name={`${groupName}-reveal`}>
                  <FormControlLabel value="true" control={<Radio disabled />} label="True" />
                  <FormControlLabel value="false" control={<Radio disabled />} label="False" />
                </RadioGroup>
              </FormControl>
            </SolutionReveal>
          </Stack>
        </Box>
      </Box>

      {message && (
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
          isDisabled={selectedValue === '' || isLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
        />
      )}
    </Stack>
  )
}
