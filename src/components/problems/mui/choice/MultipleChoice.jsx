import { useState, useEffect, useId, useRef } from 'react'
import { Box, Checkbox, FormControl, FormControlLabel, FormGroup, Radio, RadioGroup, Typography } from '@mui/material'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import ProblemFrame, { choiceLabelWithGapSx, sectionLabelSx } from '../frame/ProblemFrame.jsx'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'
import SolutionReveal from '../../SolutionReveal.jsx'
import PromptText from '../../../ui/PromptText.jsx'
import { hasNonEmptyAnswerIndices, isMultiSelectSubquestion } from '../../../../lib/logicpenguin/multiple-choice-utils.js'

const defaultTrueFalseChoices = ['True', 'False']

const multiSelectLabelSx = { ...choiceLabelWithGapSx, ml: 2 }
const singleSelectLabelSx = choiceLabelWithGapSx

const isMissingSingleValue = (value) => (
  value === '' || value === null || value === undefined
)

const hasIncompleteCompositeSelection = (subquestions, selectedValue) => (
  subquestions.some((subq, idx) => {
    const value = selectedValue?.[idx]
    if (isMultiSelectSubquestion(subq)) {
      return !Array.isArray(value) || value.length === 0
    }
    return isMissingSingleValue(value)
  })
)

function ChoiceGroup({
  choices,
  isMultiSelect,
  selectedValue,
  name,
  disabled,
  onSingleChange,
  onMultiChange,
}) {
  if (isMultiSelect) {
    return (
      <FormGroup>
        {choices.map((choice, index) => (
          <FormControlLabel
            key={`${name}-${index}`}
            control={(
              <Checkbox
                checked={Array.isArray(selectedValue) && selectedValue.includes(index)}
                onChange={onMultiChange ? (event) => onMultiChange(index, event.target.checked) : undefined}
                disabled={disabled}
              />
            )}
            label={choice}
            sx={multiSelectLabelSx}
          />
        ))}
      </FormGroup>
    )
  }

  const radioValue = selectedValue === '' || selectedValue === null || selectedValue === undefined
    ? ''
    : String(selectedValue)

  return (
    <RadioGroup
      value={radioValue}
      onChange={onSingleChange ? (event) => onSingleChange(event.target.value) : undefined}
      name={name}
    >
      {choices.map((choice, index) => (
        <FormControlLabel
          key={`${name}-${index}`}
          value={String(index)}
          control={<Radio disabled={disabled} />}
          label={choice}
          sx={singleSelectLabelSx}
        />
      ))}
    </RadioGroup>
  )
}

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
  problemLabel,
}) {
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const prompt = problem?.prompt || ''
  const rawSubquestions = problem?.subquestions
  const subquestions = Array.isArray(rawSubquestions) ? rawSubquestions : []
  const isComposite = subquestions.length > 0
  const isMultiSelect = !isComposite && (
    Array.isArray(answer)
    || hasNonEmptyAnswerIndices(problem)
    || problem?.multiSelect
  )
  const autoGroupId = useId()
  const groupBase = assignmentQuestionId ? `aq-${assignmentQuestionId}` : `mc-${autoGroupId}`

  const normalizeCompositeAnswers = (subs, saved) => (
    subs.map((subq, idx) => {
      const savedValue = saved?.[idx]
      if (Array.isArray(savedValue)) {
        return savedValue.map(Number).filter((value) => Number.isFinite(value))
      }
      if (savedValue === '') {
        return isMultiSelectSubquestion(subq) ? [] : ''
      }
      if (savedValue !== undefined && savedValue !== null) {
        return Number.isFinite(Number(savedValue)) ? Number(savedValue) : savedValue
      }
      return isMultiSelectSubquestion(subq) ? [] : ''
    })
  )

  const [selectedValue, setSelectedValue] = useState(
    isComposite
      ? normalizeCompositeAnswers(subquestions, savedState?.answers)
      : isMultiSelect
        ? (Array.isArray(savedState?.ans) ? savedState.ans.map(Number) : [])
        : (savedState?.ans !== undefined ? String(savedState.ans) : '')
  )

  const hasIncompleteSelection = () => (
    isComposite
      ? hasIncompleteCompositeSelection(subquestions, selectedValue)
      : (isMultiSelect
        ? !Array.isArray(selectedValue) || selectedValue.length === 0
        : isMissingSingleValue(selectedValue))
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
          : parseInt(selectedValue, 10)
    ),
    onComplete,
    isDisabled: hasIncompleteSelection,
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
  const isSubmitDisabled = isLocked || isAssignmentLocked || hasIncompleteSelection()

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
  }, [savedState?.ans, savedState?.answers, isComposite, isMultiSelect, rawSubquestions])

  const setUnanswered = () => {
    setStatus('unanswered')
    setMessage('')
  }

  const handleSingleChange = (nextValue) => {
    if (readOnly) return
    setSelectedValue(nextValue)
    onStateChange?.({ ans: parseInt(nextValue, 10) })
    setUnanswered()
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
    setUnanswered()
  }

  const handleCompositeSingleChange = (index, value) => {
    if (readOnly || isLocked) return
    setSelectedValue((prev) => {
      const next = Array.isArray(prev) ? [...prev] : []
      next[index] = value
      onStateChange?.({ answers: next })
      return next
    })
    setUnanswered()
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
    setUnanswered()
  }

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={prompt}
      minHeight="200px"
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
          isDisabled={isSubmitDisabled}
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
        />
      ) : null}
    >
      {isComposite ? (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {subquestions.map((subq, subIdx) => {
            const choices = subq?.type === 'true-false'
              ? (subq?.choices?.length ? subq.choices : defaultTrueFalseChoices)
              : (Array.isArray(subq?.choices) ? subq.choices : [])

            return (
              <Box key={`mc-subq-${subIdx}`}>
                <PromptText content={subq?.prompt} variant="subtitle2" sx={{ ...sectionLabelSx, fontWeight: 600 }} />
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <ChoiceGroup
                    choices={choices}
                    isMultiSelect={isMultiSelectSubquestion(subq)}
                    selectedValue={selectedValue?.[subIdx]}
                    name={`${groupBase}-subq-${subIdx}`}
                    disabled={readOnly || isLocked}
                    onSingleChange={(value) => {
                      const nextValue = value === '' ? '' : Number(value)
                      handleCompositeSingleChange(subIdx, nextValue)
                    }}
                    onMultiChange={(choiceIndex, checked) => {
                      handleCompositeMultiChange(subIdx, choiceIndex, checked)
                    }}
                  />
                </FormControl>
              </Box>
            )
          })}
        </Box>
      ) : (
        <Box>
          {isInstructorView && proof && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sectionLabelSx }}>
              <Typography variant="subtitle2" color="text.secondary">Choices</Typography>
            </Box>
          )}
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <ChoiceGroup
              choices={Array.isArray(problem?.choices) ? problem.choices : []}
              isMultiSelect={isMultiSelect}
              selectedValue={selectedValue}
              name={`${groupBase}-single`}
              disabled={readOnly}
              onSingleChange={handleSingleChange}
              onMultiChange={handleMultiChange}
            />
          </FormControl>
        </Box>
      )}
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          {isComposite ? (
            <Box sx={{ display: 'grid', gap: 3 }}>
              {subquestions.map((subq, subIdx) => {
                const choices = subq?.type === 'true-false'
                  ? (subq?.choices?.length ? subq.choices : defaultTrueFalseChoices)
                  : (Array.isArray(subq?.choices) ? subq.choices : [])
                const isMulti = isMultiSelectSubquestion(subq)
                const expected = isMulti
                  ? (Array.isArray(subq.answerIndices) ? subq.answerIndices : [])
                  : (Number.isFinite(subq.answerIndex) ? subq.answerIndex : null)

                      return (
                        <Box key={`solution-${subIdx}`}>
                          <PromptText content={subq?.prompt} variant="subtitle2" sx={{ ...sectionLabelSx, fontWeight: 600 }} />
                          <FormControl component="fieldset" sx={{ width: '100%' }}>
                      <ChoiceGroup
                        choices={choices}
                        isMultiSelect={isMulti}
                        selectedValue={expected}
                        name={`${groupBase}-reveal-${subIdx}`}
                        disabled
                      />
                    </FormControl>
                  </Box>
                )
              })}
            </Box>
          ) : (
            <FormControl component="fieldset" sx={{ width: '100%' }}>
              <ChoiceGroup
                choices={Array.isArray(problem?.choices) ? problem.choices : []}
                isMultiSelect={isMultiSelect}
                selectedValue={correctAnswer}
                name={`${groupBase}-reveal`}
                disabled
              />
            </FormControl>
          )}
        </SolutionReveal>
      )}
    </ProblemFrame>
  )
}
