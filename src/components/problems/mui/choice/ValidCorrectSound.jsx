import { useEffect, useRef, useState } from 'react'
import { FormControl, FormControlLabel, Radio, RadioGroup, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material'
import ProblemFrame, { choiceLabelSx, choiceLabelWithGapSx, sectionLabelSx } from '../frame/ProblemFrame.jsx'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import SolutionReveal from '../../SolutionReveal.jsx'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'

const questionRows = [
  { key: 'correct', label: 'Factually correct' },
  { key: 'valid', label: 'Valid' },
  { key: 'sound', label: 'Sound' },
]

const toStoredValue = (value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return ''
}

const toRadioValue = (value) => {
  if (value === true) return 'true'
  if (value === false) return 'false'
  return ''
}

export default function ValidCorrectSound({
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
  suppressReveal = false,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
  problemLabel,
  logicSystem,
}) {
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const [answers, setAnswers] = useState(() => ({
    correct: toRadioValue(savedState?.ans?.correct),
    valid: toRadioValue(savedState?.ans?.valid),
    sound: toRadioValue(savedState?.ans?.sound),
  }))

  const buildAnswerPayload = (values) => ({
    correct: toStoredValue(values.correct),
    valid: toStoredValue(values.valid),
    sound: toStoredValue(values.sound),
  })

  const isComplete = (values) => questionRows.every(({ key }) => values[key] !== '')

  const { status, message, isChecking, handleCheck, handleStartOver, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer,
    problemType: 'valid-correct-sound',
    question: problem,
    getAnswer: () => buildAnswerPayload(answers),
    onComplete,
    isDisabled: () => !isComplete(answers),
    resetInput: () => setAnswers({ correct: '', valid: '', sound: '' }),
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  const showSolution = !suppressReveal && isLocked && status !== 'correct'

  useEffect(() => {
    setAnswers({
      correct: toRadioValue(savedState?.ans?.correct),
      valid: toRadioValue(savedState?.ans?.valid),
      sound: toRadioValue(savedState?.ans?.sound),
    })
  }, [savedState?.ans?.correct, savedState?.ans?.valid, savedState?.ans?.sound])

  const handleValueChange = (key, value) => {
    if (readOnly) return
    setAnswers((prev) => {
      const next = { ...prev, [key]: value }
      onStateChange?.({ ans: buildAnswerPayload(next) })
      return next
    })
    setStatus('unanswered')
    setMessage('')
  }

  const renderAnswerTable = (values, tableReadOnly) => (
    <Table>
      <TableBody>
        {questionRows.map(({ key, label }) => (
          <TableRow key={key}>
            <TableCell sx={{ border: 'none', py: 1, pl: 0, verticalAlign: 'top' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {label}
              </Typography>
            </TableCell>
            <TableCell sx={{ border: 'none', py: 0.5, pr: 0 }}>
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <RadioGroup
                  row
                  value={values[key]}
                  onChange={(event) => handleValueChange(key, event.target.value)}
                  name={`vcs-${key}`}
                >
                  <FormControlLabel
                    value="true"
                    control={<Radio size="small" disabled={tableReadOnly} />}
                    label="Yes"
                    sx={choiceLabelWithGapSx}
                  />
                  <FormControlLabel
                    value="false"
                    control={<Radio size="small" disabled={tableReadOnly} />}
                    label="No"
                    sx={choiceLabelSx}
                  />
                </RadioGroup>
              </FormControl>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={problem?.prompt || proof?.description || ''}
      minHeight="220px"
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
          isDisabled={!isComplete(answers) || isLocked || isAssignmentLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      ) : null}
      editorNode={isInstructorView && proof ? (
        <InstructorQuestionEditor
          ref={editorRef}
          proof={proof}
          isInstructorView
          onSaved={onQuestionSaved}
          trigger="none"
          logicSystem={logicSystem}
        />
      ) : null}
    >
      {Array.isArray(problem?.prems) && problem.prems.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ ...sectionLabelSx, mb: 0, fontWeight: 600, color: 'text.primary' }}>
            Premises
          </Typography>
          {problem.prems.map((premise, index) => (
            <Typography key={`${premise}-${index}`} variant="body2">
              {index + 1}. {premise}
            </Typography>
          ))}
          {problem?.conc && (
            <>
              <Typography variant="body2" sx={{ ...sectionLabelSx, mb: 0, mt: 1, fontWeight: 600, color: 'text.primary' }}>
                Conclusion
              </Typography>
              <Typography variant="body2">{problem.conc}</Typography>
            </>
          )}
        </Stack>
      )}
      {renderAnswerTable(answers, readOnly)}
      {showSolution && (
        <SolutionReveal show={showSolution}>
          {renderAnswerTable({
            correct: toRadioValue(answer?.correct),
            valid: toRadioValue(answer?.valid),
            sound: toRadioValue(answer?.sound),
          }, true)}
        </SolutionReveal>
      )}
    </ProblemFrame>
  )
}
