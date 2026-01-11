import { useState, useEffect } from 'react'
import { Box, Stack, Radio, RadioGroup, FormControlLabel, FormControl, FormGroup, Checkbox, Typography, Alert } from '@mui/material'
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
  const subquestions = Array.isArray(problem?.subquestions) ? problem.subquestions : []
  const isComposite = subquestions.length > 0
  const isMultiSelect = !isComposite && (Array.isArray(answer) || Array.isArray(problem?.answerIndices) || problem?.multiSelect)
  const defaultTrueFalseChoices = ['True', 'False']
  const isMultiSelectSubq = (subq) =>
    subq?.type === 'multi-select' || Array.isArray(subq?.answerIndices) || subq?.multiSelect
  const isTrueFalseSubq = (subq) => subq?.type === 'true-false'
  const normalizeCompositeAnswers = (subs, saved) =>
    subs.map((subq, idx) => {
      const savedValue = saved?.[idx]
      if (Array.isArray(savedValue)) {
        return savedValue.map(Number).filter((value) => Number.isFinite(value))
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
  
  const { message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, isLocked } = useProblemChecker({
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
  const showSolution = isLocked && (isComposite || typeof answer === 'number' || Array.isArray(answer))

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
            {isComposite ? (
              <Stack spacing={3}>
                {subquestions.map((subq, subIdx) => {
                  const choices = isTrueFalseSubq(subq)
                    ? (subq?.choices?.length ? subq.choices : defaultTrueFalseChoices)
                    : (subq?.choices || [])
                  return (
                    <Box key={`mc-subq-${subIdx}`}>
                      {subq?.prompt && (
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          {subq.prompt}
                        </Typography>
                      )}
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
                                sx={{
                                  mb: 1,
                                  '& .MuiFormControlLabel-label': { fontSize: '1rem' }
                                }}
                              />
                            ))}
                          </FormGroup>
                        ) : (
                          <RadioGroup
                            value={selectedValue?.[subIdx] === '' ? '' : String(selectedValue?.[subIdx] ?? '')}
                            onChange={(event) => handleCompositeSingleChange(subIdx, Number(event.target.value))}
                            name={`multiple-choice-${subIdx}`}
                          >
                            {choices.map((choice, index) => (
                              <FormControlLabel
                                key={`${subIdx}-${index}`}
                                value={String(index)}
                                control={<Radio disabled={readOnly || isLocked} />}
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
                        key={index}
                        control={
                          <Checkbox
                            checked={Array.isArray(selectedValue) && selectedValue.includes(index)}
                            onChange={(event) => handleMultiChange(index, event.target.checked)}
                            disabled={readOnly}
                          />
                        }
                        label={choice}
                        sx={{
                          mb: 1,
                          '& .MuiFormControlLabel-label': {
                            fontSize: '1rem'
                          }
                        }}
                      />
                    ))}
                  </FormGroup>
                ) : (
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
                )}
              </FormControl>
            )}
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
                    {subq?.prompt && (
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        {subq.prompt}
                      </Typography>
                    )}
                    <FormControl component="fieldset" sx={{ width: '100%' }}>
                      {isMulti ? (
                        <FormGroup>
                          {choices.map((choice, index) => (
                            <FormControlLabel
                              key={`${subIdx}-${index}`}
                              control={<Checkbox checked={expected?.includes(index)} disabled />}
                              label={choice}
                              sx={{
                                mb: 1,
                                '& .MuiFormControlLabel-label': { fontSize: '1rem' }
                              }}
                            />
                          ))}
                        </FormGroup>
                      ) : (
                        <RadioGroup value={expected === null ? '' : String(expected)} name={`multiple-choice-reveal-${subIdx}`}>
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
                      control={<Checkbox checked={Array.isArray(answer) && answer.includes(index)} disabled />}
                      label={choice}
                      sx={{
                        mb: 1,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '1rem'
                        }
                      }}
                    />
                  ))}
                </FormGroup>
              ) : (
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
              )}
            </FormControl>
          )}
        </SolutionReveal>
      )}
    </Stack>
  )
}
