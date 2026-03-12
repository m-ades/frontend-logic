import { useState, useEffect, useId, useRef } from 'react'
import { FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import ProblemFrame from './ProblemFrame.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'

export default function TrueFalse({
  problem,
  proof,
  answer,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  readOnly = false,
  hideActions = false,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
}) {
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
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
    <ProblemFrame
      prompt={prompt}
      minHeight="150px"
      isInstructorView={isInstructorView && !!proof}
      onEditQuestion={proof ? openEdit : undefined}
      status={status}
      message={message}
      onCloseStatus={() => setMessage('')}
      actionNode={!hideActions ? (
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={selectedValue === '' || isLocked || isAssignmentLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      ) : null}
      editorNode={isInstructorView && proof ? (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" />
      ) : null}
    >
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
      <SolutionReveal show={showSolution}>
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <RadioGroup value={answer ? 'true' : 'false'} name={`${groupName}-reveal`}>
            <FormControlLabel value="true" control={<Radio disabled />} label="True" />
            <FormControlLabel value="false" control={<Radio disabled />} label="False" />
          </RadioGroup>
        </FormControl>
      </SolutionReveal>
    </ProblemFrame>
  )
}
