import { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import ProblemFrame from '../frame/ProblemFrame.jsx'
import FormulaField from '../inputs/FormulaField.jsx'
import SymbolToolbar from '../inputs/SymbolToolbar.jsx'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'
import SolutionReveal from '../../SolutionReveal.jsx'
import RichText from '../../../ui/RichText.jsx'
import {
  getConstantLettersFromKey,
  getConstantLettersFromPromptAndKey,
  getPredicateLettersFromKey,
  isPredicateLogicKey,
  PREDICATE_VARIABLES,
} from '../../../ui/LogicKeyboard/mobileKeyboardConfig.js'

export default function SymbolicTranslation({
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
  const [inputValue, setInputValue] = useState(savedState?.ans || '')
  const formulaInputRef = useRef(null)
  const solutionInputRef = useRef(null)
  const hasHydratedRef = useRef(false)
  const saveTimerRef = useRef(null)
  const lastSavedValueRef = useRef(null)
  const legend = problem?.legend || problem?.question_snapshot?.legend
  const prompt = problem?.prompt || ''
  const symbolizationKeyRaw = problem?.symbolizationKey
    ?? problem?.symbolization_key
    ?? problem?.question_snapshot?.symbolizationKey
    ?? problem?.question_snapshot?.symbolization_key
  const symbolizationKey = Array.isArray(symbolizationKeyRaw)
    ? symbolizationKeyRaw.filter(Boolean)
    : (typeof symbolizationKeyRaw === 'string'
      ? symbolizationKeyRaw.split('\n').map((line) => line.trim()).filter(Boolean)
      : [])
  const isPredicate = isPredicateLogicKey(symbolizationKey)
  const predicateLetters = isPredicate ? getPredicateLettersFromKey(symbolizationKey) : []
  const constantsFromKey = getConstantLettersFromKey(symbolizationKey)
  const constantLetters = isPredicate
    ? (constantsFromKey.length > 0
        ? constantsFromKey
        : getConstantLettersFromPromptAndKey(prompt, symbolizationKey, 3))
    : []
  const variableLetters = isPredicate ? PREDICATE_VARIABLES : []

  const scheduleStateSave = useCallback((nextValue) => {
    if (!onStateChange) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      if (lastSavedValueRef.current === nextValue) return
      lastSavedValueRef.current = nextValue
      onStateChange({ ans: nextValue })
    }, 200)
  }, [onStateChange])

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer,
    problemType: 'symbolic-translation',
    question: problem,
    getAnswer: () => inputValue,
    onComplete,
    isDisabled: () => !inputValue.trim(),
    resetInput: () => {
      setInputValue('')
      lastSavedValueRef.current = ''
    },
    onStateChange: (state) => {
      if (state?.ans !== undefined) {
        setInputValue(state.ans)
        lastSavedValueRef.current = state.ans
      }
      onStateChange?.(state)
    },
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })
  const showSolution = isLocked && status !== 'correct'

  useEffect(() => {
    if (hasHydratedRef.current) return
    if (savedState?.ans !== undefined) {
      hasHydratedRef.current = true
      setInputValue(savedState.ans)
      lastSavedValueRef.current = savedState.ans
    }
  }, [savedState?.ans])

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [])

  return (
    <ProblemFrame
      problemLabel={problemLabel}
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
          isDisabled={!inputValue.trim() || isLocked || isAssignmentLocked}
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
      <Box>
        {symbolizationKey.length > 0 && (
          <Box sx={{ mb: 1, mt: 2.5 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Symbolization key
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0, color: 'text.secondary' }}>
              {symbolizationKey.map((line, index) => (
                <Typography
                  key={`${line}-${index}`}
                  component="li"
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {line}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
        {legend && (
          <RichText content={legend} variant="body2" sx={{ mb: 1, color: 'text.secondary' }} />
        )}
        <Typography variant="body2" sx={{ mb: 1, mt: 2.5, color: 'text.secondary' }}>
          Your translation:
        </Typography>
        <FormulaField
          value={inputValue}
          onValueChange={(value) => {
            if (readOnly) return
            setInputValue(value)
            scheduleStateSave(value)
          }}
          readOnly={readOnly}
          ref={formulaInputRef}
          onEnterKey={!readOnly && !hideActions ? handleCheck : undefined}
          symbolizationKey={symbolizationKey}
          includeQuantifiers={isPredicate}
          predicateLetters={isPredicate ? predicateLetters : undefined}
          constantLetters={isPredicate ? constantLetters : undefined}
          variableLetters={isPredicate ? variableLetters : undefined}
        />
        <Box sx={{ mt: 1 }}>
          <SymbolToolbar
            inputRef={formulaInputRef}
            disabled={readOnly}
            includeQuantifiers={isPredicate}
            onValueChange={(value) => {
              if (readOnly) return
              setInputValue(value)
              scheduleStateSave(value)
            }}
          />
        </Box>
      </Box>
      {!suppressReveal && (
        <SolutionReveal show={showSolution}>
          <FormulaField
            value={answer ?? ''}
            onValueChange={null}
            readOnly
            ref={solutionInputRef}
          />
        </SolutionReveal>
      )}
    </ProblemFrame>
  )
}
