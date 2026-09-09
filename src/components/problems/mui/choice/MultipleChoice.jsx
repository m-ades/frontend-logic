import { useState, useEffect, useId, useRef } from 'react'
import { Box } from '@mui/material'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import ProblemFrame from '../frame/ProblemFrame.jsx'
import { FieldsetChoiceGroup, SubquestionChoiceList } from './ChoiceGroup.jsx'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'
import SolutionReveal from '../../SolutionReveal.jsx'
import {
  getSingleSelectAnswerIndex,
  hasNonEmptyAnswerIndices,
  isMultiSelectSubquestion,
} from '../../../../lib/logicpenguin/multiple-choice-utils.js'

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
  logicSystem,
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
    options: { partialCredit: Boolean(proof?.partialCredit ?? problem?.partialCredit) },
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
          logicSystem={logicSystem}
        />
      ) : null}
    >
      {isComposite ? (
        <SubquestionChoiceList
          questions={subquestions}
          selectedValues={selectedValue}
          namePrefix={`${groupBase}-subq`}
          disabled={readOnly || isLocked}
          onSingleChange={(subIdx, value) => {
            const nextValue = value === '' ? '' : Number(value)
            handleCompositeSingleChange(subIdx, nextValue)
          }}
          onMultiChange={handleCompositeMultiChange}
        />
      ) : (
        <Box>
          <FieldsetChoiceGroup
            choices={Array.isArray(problem?.choices) ? problem.choices : []}
            isMultiSelect={isMultiSelect}
            selectedValue={selectedValue}
            name={`${groupBase}-single`}
            disabled={readOnly}
            onSingleChange={handleSingleChange}
            onMultiChange={handleMultiChange}
          />
        </Box>
      )}
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          {isComposite ? (
            <SubquestionChoiceList
              questions={subquestions}
              selectedValues={subquestions.map((subq) => (
                isMultiSelectSubquestion(subq)
                  ? (Array.isArray(subq.answerIndices) ? subq.answerIndices : [])
                  : getSingleSelectAnswerIndex(subq)
              ))}
              namePrefix={`${groupBase}-reveal`}
              disabled
            />
          ) : (
            <FieldsetChoiceGroup
              choices={Array.isArray(problem?.choices) ? problem.choices : []}
              isMultiSelect={isMultiSelect}
              selectedValue={correctAnswer}
              name={`${groupBase}-reveal`}
              disabled
            />
          )}
        </SolutionReveal>
      )}
    </ProblemFrame>
  )
}
