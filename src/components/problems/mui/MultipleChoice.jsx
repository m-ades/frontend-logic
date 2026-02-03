import { useState, useEffect, useId, useRef } from 'react'
import { Box, Stack, Radio, RadioGroup, FormControlLabel, FormControl, FormGroup, Checkbox, Typography, IconButton, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'
import PromptText from '../../ui/PromptText.jsx'

export default function MultipleChoice({ 
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
}) {
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const prompt = problem?.prompt || ''
  const subquestions = Array.isArray(problem?.subquestions) ? problem.subquestions : []
  const isComposite = subquestions.length > 0
  const isMultiSelect = !isComposite && (Array.isArray(answer) || Array.isArray(problem?.answerIndices) || problem?.multiSelect)
  const defaultTrueFalseChoices = ['True', 'False']
  const autoGroupId = useId()
  const groupBase = assignmentQuestionId ? `aq-${assignmentQuestionId}` : `mc-${autoGroupId}`
  const isMultiSelectSubq = (subq) =>
    subq?.type === 'multi-select' || Array.isArray(subq?.answerIndices) || subq?.multiSelect
  const isTrueFalseSubq = (subq) => subq?.type === 'true-false'
  const normalizeCompositeAnswers = (subs, saved) =>
    subs.map((subq, idx) => {
      const savedValue = saved?.[idx]
      if (Array.isArray(savedValue)) {
        return savedValue.map(Number).filter((value) => Number.isFinite(value))
      }
      if (savedValue === '') {
        return isMultiSelectSubq(subq) ? [] : ''
      }
      if (savedValue !== undefined && savedValue !== null) {
        return Number.isFinite(Number(savedValue)) ? Number(savedValue) : savedValue
      }
      return isMultiSelectSubq(subq) ? [] : ''
    })

  const [selectedValue, setSelectedValue] = useState(
    isComposite
      ? normalizeCompositeAnswers(subquestions, savedState?.answers)
      : isMultiSelect
        ? (Array.isArray(savedState?.ans) ? savedState.ans.map(Number) : [])
        : (savedState?.ans !== undefined ? String(savedState.ans) : '')
  )
  
  const { status, message, isChecking, handleCheck, handleStartOver, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer,
    problemType: 'multiple-choice',
    question: problem,
    getAnswer: () => (
      isComposite
        ? { answers: selectedValue }
        : isMultiSelect
          ? selectedValue
          : parseInt(selectedValue)
    ),
    onComplete,
    isDisabled: () => (
      isComposite
        ? subquestions.some((subq, idx) => {
            const value = selectedValue?.[idx]
            if (isMultiSelectSubq(subq)) {
              return !Array.isArray(value) || value.length === 0
            }
            return value === '' || value === null || value === undefined
          })
        : isMultiSelect
          ? !Array.isArray(selectedValue) || selectedValue.length === 0
          : selectedValue === ''
    ),
    resetInput: () => setSelectedValue(
      isComposite
        ? normalizeCompositeAnswers(subquestions, [])
        : isMultiSelect
          ? []
          : ''
    ),
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })
  const correctAnswer = answer ?? problem?.answer ?? problem?.answerIndex ?? problem?.answerIndices
  const showSolution = isLocked && status !== 'correct' && (isComposite || correctAnswer !== undefined && correctAnswer !== null)
  // match checker rules
  const isSubmitDisabled = isLocked || isAssignmentLocked || (
    isComposite
      ? subquestions.some((subq, idx) => {
          const value = selectedValue?.[idx]
          if (isMultiSelectSubq(subq)) {
            return !Array.isArray(value) || value.length === 0
          }
          return value === '' || value === null || value === undefined
        })
      : isMultiSelect
        ? !Array.isArray(selectedValue) || selectedValue.length === 0
        : selectedValue === ''
  )
  const multiSelectLabelSx = {
    mb: 1,
    ml: 2,
    '& .MuiFormControlLabel-label': { fontSize: '1rem' },
  }

  useEffect(() => {
    if (isComposite) {
      setSelectedValue(normalizeCompositeAnswers(subquestions, savedState?.answers))
      return
    }
    if (savedState?.ans === undefined) {
      setSelectedValue(isMultiSelect ? [] : '')
      return
    }
    if (isMultiSelect) {
      setSelectedValue(Array.isArray(savedState.ans) ? savedState.ans.map(Number) : [])
    } else {
      setSelectedValue(String(savedState.ans))
    }
  }, [savedState?.ans, savedState?.answers, isComposite, isMultiSelect, subquestions])

  const handleChange = (event) => {
    if (readOnly) return
    const nextValue = event.target.value
    setSelectedValue(nextValue)
    onStateChange?.({ ans: parseInt(nextValue) })
    setStatus('unanswered')
    setMessage('')
  }

  const handleMultiChange = (choiceIndex, checked) => {
    if (readOnly) return
    setSelectedValue((prev) => {
      const current = Array.isArray(prev) ? prev : []
      const next = checked
        ? [...new Set([...current, choiceIndex])]
        : current.filter((value) => value !== choiceIndex)
      onStateChange?.({ ans: next })
      return next
    })
    setStatus('unanswered')
    setMessage('')
  }

  const handleCompositeSingleChange = (index, value) => {
    if (readOnly || isLocked) return
    setSelectedValue((prev) => {
      const next = Array.isArray(prev) ? [...prev] : []
      next[index] = value
      onStateChange?.({ answers: next })
      return next
    })
    setStatus('unanswered')
    setMessage('')
  }

  const handleCompositeMultiChange = (index, choiceIndex, checked) => {
    if (readOnly || isLocked) return
    setSelectedValue((prev) => {
      const next = Array.isArray(prev) ? [...prev] : []
      const current = Array.isArray(next[index]) ? next[index] : []
      const updated = checked
        ? [...new Set([...current, choiceIndex])]
        : current.filter((value) => value !== choiceIndex)
      next[index] = updated
      onStateChange?.({ answers: next })
      return next
    })
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
            {isInstructorView && proof && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Tooltip title="Edit question">
                  <Box
                    component="span"
                    onClick={openEdit}
                    role="button"
                    aria-label="Edit question"
                    sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}
                  >
                    <EditIcon fontSize="small" />
                  </Box>
                </Tooltip>
              </Box>
            )}
            {prompt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <PromptText content={prompt} sx={{ mb: 3, flex: 1 }} />
              </Box>
            )}
            {isComposite ? (
              <Stack spacing={3}>
                {subquestions.map((subq, subIdx) => {
                  const choices = isTrueFalseSubq(subq)
                    ? (subq?.choices?.length ? subq.choices : defaultTrueFalseChoices)
                    : (subq?.choices || [])
                  return (
                    <Box key={`mc-subq-${subIdx}`}>
                      <PromptText content={subq?.prompt} variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }} />
                      <FormControl component="fieldset" sx={{ width: '100%' }}>
                        {isMultiSelectSubq(subq) ? (
                          <FormGroup>
                            {choices.map((choice, index) => (
                              <FormControlLabel
                                key={`${subIdx}-${index}`}
                                control={
                                  <Checkbox
                                    checked={Array.isArray(selectedValue?.[subIdx]) && selectedValue[subIdx].includes(index)}
                                    onChange={(event) => handleCompositeMultiChange(subIdx, index, event.target.checked)}
                                    disabled={readOnly || isLocked}
                                  />
                                }
                                label={choice}
                                sx={multiSelectLabelSx}
                              />
                            ))}
                          </FormGroup>
                        ) : (
                          <RadioGroup
                            value={selectedValue?.[subIdx] === '' ? '' : String(selectedValue?.[subIdx] ?? '')}
                            name={`${groupBase}-subq-${subIdx}`}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              handleCompositeSingleChange(
                                subIdx,
                                nextValue === '' ? '' : Number(nextValue)
                              )
                            }}
                          >
                            {choices.map((choice, index) => (
                              <FormControlLabel
                                key={`${subIdx}-${index}`}
                                value={String(index)}
                                control={
                                  <Radio
                                    disabled={readOnly || isLocked}
                                  />
                                }
                                label={choice}
                                sx={{
                                  mb: 1,
                                  '& .MuiFormControlLabel-label': { fontSize: '1rem' }
                                }}
                              />
                            ))}
                          </RadioGroup>
                        )}
                      </FormControl>
                    </Box>
                  )
                })}
              </Stack>
            ) : (
              <Box>
                {isInstructorView && proof && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Choices</Typography>
                  </Box>
                )}
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                {isMultiSelect ? (
                  <FormGroup>
                    {problem.choices.map((choice, index) => (
                      <FormControlLabel
                        key={index}
                        control={
                          <Checkbox
                            checked={Array.isArray(selectedValue) && selectedValue.includes(index)}
                            onChange={(event) => handleMultiChange(index, event.target.checked)}
                            disabled={readOnly}
                          />
                        }
                        label={choice}
                        sx={multiSelectLabelSx}
                      />
                    ))}
                  </FormGroup>
                ) : (
                  <RadioGroup
                    value={selectedValue}
                    onChange={handleChange}
                    name={`${groupBase}-single`}
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
                )}
              </FormControl>
              </Box>
            )}
            {!suppressReveal && (
              /* show answer in card */
              <SolutionReveal show={showSolution}>
                {isComposite ? (
                  <Stack spacing={3}>
                    {subquestions.map((subq, subIdx) => {
                      const choices = isTrueFalseSubq(subq)
                        ? (subq?.choices?.length ? subq.choices : defaultTrueFalseChoices)
                        : (subq?.choices || [])
                      const isMulti = isMultiSelectSubq(subq)
                      const expected = isMulti
                        ? (Array.isArray(subq.answerIndices) ? subq.answerIndices : [])
                        : (Number.isFinite(subq.answerIndex) ? subq.answerIndex : null)
                      return (
                        <Box key={`solution-${subIdx}`}>
                          <PromptText content={subq?.prompt} variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }} />
                          <FormControl component="fieldset" sx={{ width: '100%' }}>
                            {isMulti ? (
                              <FormGroup>
                                {choices.map((choice, index) => (
                                  <FormControlLabel
                                    key={`${subIdx}-${index}`}
                                    control={<Checkbox checked={expected?.includes(index)} disabled />}
                                    label={choice}
                                    sx={multiSelectLabelSx}
                                  />
                                ))}
                              </FormGroup>
                            ) : (
                              <RadioGroup value={expected === null ? '' : String(expected)} name={`${groupBase}-reveal-${subIdx}`}>
                                {choices.map((choice, index) => (
                                  <FormControlLabel
                                    key={`${subIdx}-${index}`}
                                    value={String(index)}
                                    control={<Radio disabled />}
                                    label={choice}
                                    sx={{
                                      mb: 1,
                                      '& .MuiFormControlLabel-label': { fontSize: '1rem' }
                                    }}
                                  />
                                ))}
                              </RadioGroup>
                            )}
                          </FormControl>
                        </Box>
                      )
                    })}
                  </Stack>
                ) : (
                  <FormControl component="fieldset" sx={{ width: '100%' }}>
                    {isMultiSelect ? (
                      <FormGroup>
                        {problem.choices.map((choice, index) => (
                          <FormControlLabel
                            key={`${choice}-${index}`}
                            control={<Checkbox checked={Array.isArray(correctAnswer) && correctAnswer.includes(index)} disabled />}
                            label={choice}
                            sx={multiSelectLabelSx}
                          />
                        ))}
                      </FormGroup>
                    ) : (
                      <RadioGroup value={String(correctAnswer ?? '')} name={`${groupBase}-reveal`}>
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
                    )}
                  </FormControl>
                )}
              </SolutionReveal>
            )}
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
          isDisabled={isSubmitDisabled}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      )}
      {isInstructorView && proof && (
        <InstructorQuestionEditor
          ref={editorRef}
          proof={proof}
          isInstructorView
          onSaved={onQuestionSaved}
          trigger="none"
        />
      )}
    </Stack>
  )
}
