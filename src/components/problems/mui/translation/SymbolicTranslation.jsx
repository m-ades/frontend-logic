import { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Stack, Typography, Alert, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import { useTheme, useMediaQuery } from '@mui/material'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import FormulaInput from '../../../ui/logicpenguin/formula-input.js'
import SymbolButtonRow from '../../../ui/logicpenguin/SymbolButtonRow.jsx'
import { MobileLogicInput } from '../../../ui/LogicKeyboard/index.js'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'
import SolutionReveal from '../../SolutionReveal.jsx'
import StatusBanner, { isTerminalStatus } from '../../../ui/StatusBanner.jsx'
import PromptText from '../../../ui/PromptText.jsx'
import RichText from '../../../ui/RichText.jsx'
import {
  ST_PREDICATE_VARIABLES,
  getConstantLettersFromKey,
  getConstantLettersFromPromptAndKey,
  getPredicateLettersFromKey,
  isPredicateLogicKey,
  promptImpliesPredicateLogic,
} from './symbolizationKeyboard.js'
import { getNotation } from '../../../../lib/logicSystems.js'

function FormulaInputField({ value, onValueChange, fieldReadOnly, formulaInputRef, onEnterKey, ariaLabel, notation }) {
  const theme = useTheme()
  const containerRef = useRef(null)
  const changeHandlerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (!formulaInputRef.current) {
      const formulaInput = FormulaInput.getnew({ notation })
      formulaInputRef.current = formulaInput
      formulaInput.style.width = '100%'
      formulaInput.style.padding = theme.spacing(1.5)
      formulaInput.style.border = `1px solid ${theme.palette.divider}`
      formulaInput.style.borderRadius = theme.shape.borderRadius
      formulaInput.style.fontSize = '1rem'
      formulaInput.style.fontFamily = 'monospace'
      formulaInput.style.backgroundColor = theme.palette.background.paper
      formulaInput.style.color = theme.palette.text.primary
      formulaInput.setAttribute('aria-label', ariaLabel || 'Formula input')
      containerRef.current.appendChild(formulaInput)
    } else if (!containerRef.current.contains(formulaInputRef.current)) {
      containerRef.current.appendChild(formulaInputRef.current)
    }
    return () => {
      if (formulaInputRef.current) {
        if (changeHandlerRef.current) {
          formulaInputRef.current.removeEventListener('input', changeHandlerRef.current)
          formulaInputRef.current.removeEventListener('change', changeHandlerRef.current)
          changeHandlerRef.current = null
        }
        if (formulaInputRef.current.parentNode) {
          formulaInputRef.current.parentNode.removeChild(formulaInputRef.current)
        }
        formulaInputRef.current = null
      }
    }
  }, [ariaLabel, formulaInputRef, notation, theme])

  useEffect(() => {
    if (!formulaInputRef.current) return
    formulaInputRef.current.setAttribute('aria-label', ariaLabel || 'Formula input')
  }, [ariaLabel, formulaInputRef])

  useEffect(() => {
    const formulaInput = formulaInputRef.current
    if (!formulaInput) return
    formulaInput.readOnly = fieldReadOnly
    if (changeHandlerRef.current) {
      formulaInput.removeEventListener('input', changeHandlerRef.current)
      formulaInput.removeEventListener('change', changeHandlerRef.current)
      changeHandlerRef.current = null
    }
    if (!fieldReadOnly && onValueChange) {
      const handleChange = () => {
        if (fieldReadOnly) return
        const nextValue = formulaInput.value
        onValueChange(nextValue)
      }
      changeHandlerRef.current = handleChange
      formulaInput.addEventListener('input', handleChange)
      formulaInput.addEventListener('change', handleChange)
    }
    return () => {
      if (changeHandlerRef.current) {
        formulaInput.removeEventListener('input', changeHandlerRef.current)
        formulaInput.removeEventListener('change', changeHandlerRef.current)
        changeHandlerRef.current = null
      }
    }
  }, [fieldReadOnly, onValueChange, formulaInputRef])

  useEffect(() => {
    if (formulaInputRef.current && value !== undefined && formulaInputRef.current.value !== value) {
      formulaInputRef.current.value = value
    }
  }, [value, formulaInputRef])

  useEffect(() => {
    const formulaInput = formulaInputRef.current
    if (!formulaInput || !onEnterKey) return
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onEnterKey()
      }
    }
    formulaInput.addEventListener('keydown', handleKeyDown)
    return () => formulaInput.removeEventListener('keydown', handleKeyDown)
  }, [formulaInputRef, onEnterKey])

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        minHeight: '56px',
        display: 'flex',
        alignItems: 'center'
      }}
    />
  )
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
  logicSystem,
}) {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const editorRef = useRef(null)
  const notation = getNotation(logicSystem)
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
  // key lines
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
  const variableLetters = isPredicate ? ST_PREDICATE_VARIABLES : []

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
      if (formulaInputRef.current) {
        formulaInputRef.current.value = ''
      }
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
            {isInstructorView && proof && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="Edit question">
                  <Box component="span" onClick={openEdit} role="button" aria-label="Edit question" sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}>
                    <EditIcon fontSize="small" />
                  </Box>
                </Tooltip>
              </Box>
            )}
            <Box>
              {prompt && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <PromptText content={prompt} sx={{ mb: 1 }} />
                </Box>
              )}
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
              {isPhone ? (
                <MobileLogicInput
                  value={inputValue}
                  onChange={(value) => {
                    if (readOnly) return
                    setInputValue(value)
                    scheduleStateSave(value)
                  }}
                  disabled={readOnly}
                  placeholder="e.g. P • Q"
                  aria-label="Formula translation"
                  symbolizationKey={symbolizationKey}
                  includeQuantifiers={isPredicate}
                  onEnterKey={!readOnly && !hideActions ? handleCheck : undefined}
                  predicateLetters={isPredicate ? predicateLetters : undefined}
                  constantLetters={isPredicate ? constantLetters : undefined}
                  variableLetters={isPredicate ? variableLetters : undefined}
                  logicSystem={logicSystem}
                />
              ) : (
                <>
                  <FormulaInputField
                    value={inputValue}
                    onValueChange={(value) => {
                      if (readOnly) return
                      setInputValue(value)
                      scheduleStateSave(value)
                    }}
                    fieldReadOnly={readOnly}
                    formulaInputRef={formulaInputRef}
                    onEnterKey={!readOnly && !hideActions ? handleCheck : undefined}
                    ariaLabel="Your translation"
                    notation={notation}
                  />
                  <Box sx={{ mt: 1 }}>
                    <SymbolButtonRow
                      inputRef={formulaInputRef}
                      disabled={readOnly}
                      includeQuantifiers={isPredicate}
                      onValueChange={(value) => {
                        if (readOnly) return
                        setInputValue(value)
                        scheduleStateSave(value)
                      }}
                      logicSystem={logicSystem}
                    />
                  </Box>
                </>
              )}
            </Box>
            {!suppressReveal && (
              /* show answer in card */
              <SolutionReveal show={showSolution}>
                <FormulaInputField
                  value={answer ?? ''}
                  onValueChange={null}
                  fieldReadOnly
                  formulaInputRef={solutionInputRef}
                  ariaLabel="Correct translation"
                />
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
          isDisabled={!inputValue.trim() || isLocked || isAssignmentLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      )}
      {isInstructorView && proof && (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" logicSystem={logicSystem} />
      )}
    </Stack>
  )
}
