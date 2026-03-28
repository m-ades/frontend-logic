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

const PREDICATE_VARIABLES = ['x', 'y', 'z']
const CONSTANT_POOL = 'abcdefghijklmnopqrstuvw'.split('')

function getLeftPart(line) {
  const s = typeof line === 'string' ? line : String(line ?? '')
  const idx = s.search(/[=:]/)
  return idx === -1 ? s.trim() : s.slice(0, idx).trim()
}

function isPredicateLogicKey(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return false
  return symbolizationKey.some((line) => {
    const left = getLeftPart(line)
    const isConstantStyle =
      left.length === 1 && /^[a-z]$/.test(left) && !['x', 'y', 'z'].includes(left)
    const isPredicateStyle = left.length > 1 && /^[A-Z]/.test(left)
    return isConstantStyle || isPredicateStyle
  })
}

function getPredicateLettersFromKey(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return []
  const seen = new Set()
  return symbolizationKey
    .map((line) => {
      const left = getLeftPart(line)
      const match = left.match(/^[A-Z]+/)
      return match ? match[0] : null
    })
    .filter((letter) => letter && !seen.has(letter) && (seen.add(letter), true))
}

function getConstantLettersFromKey(symbolizationKey) {
  if (!Array.isArray(symbolizationKey) || symbolizationKey.length === 0) return []
  const result = []
  const seen = new Set()
  for (const line of symbolizationKey) {
    const left = getLeftPart(line)
    if (
      left.length === 1 &&
      /^[a-z]$/.test(left) &&
      !['x', 'y', 'z'].includes(left) &&
      !seen.has(left)
    ) {
      seen.add(left)
      result.push(left)
    }
  }
  return result
}

function getConstantLettersFromPromptAndKey(promptText, symbolizationKey, count = 3) {
  const prompt = typeof promptText === 'string' ? promptText : String(promptText ?? '')
  const keyText = Array.isArray(symbolizationKey)
    ? symbolizationKey.map((line) => (typeof line === 'string' ? line : String(line ?? ''))).join(' ')
    : ''
  const combined = [prompt, keyText].filter(Boolean).join(' ')
  if (!combined) return CONSTANT_POOL.slice(0, count)
  const text = combined.replace(/<[^>]+>/g, ' ').toLowerCase()
  const used = new Set(text.match(/[a-z]/g) || [])
  const result = []
  for (const c of CONSTANT_POOL) {
    if (!used.has(c)) {
      result.push(c)
      if (result.length >= count) break
    }
  }
  return result.length > 0 ? result : ['a', 'b', 'c']
}

function promptImpliesPredicateLogic(promptText) {
  const prompt = typeof promptText === 'string' ? promptText : String(promptText ?? '')
  const text = prompt.replace(/<[^>]+>/g, ' ').toLowerCase()
  return /\bpredicate logic\b/.test(text)
}

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
  const isPredicate = isPredicateLogicKey(symbolizationKey) || promptImpliesPredicateLogic(prompt)
  const predicateLetters = isPredicate ? getPredicateLettersFromKey(symbolizationKey) : []
  const constantsFromKey = getConstantLettersFromKey(symbolizationKey)
  const constantLetters = isPredicate
    ? (constantsFromKey.length > 0
        ? constantsFromKey
        : (symbolizationKey.length === 0
            ? getConstantLettersFromPromptAndKey(prompt, symbolizationKey, 3)
            : []))
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
      promptSx={{ mb: 1, color: 'text.secondary' }}
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
          placeholder="e.g. P • Q"
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
