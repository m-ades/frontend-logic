import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, IconButton, Stack, Typography, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import StatusBanner, { isTerminalStatus } from '../../../ui/StatusBanner.jsx'
import { useTheme, useMediaQuery } from '@mui/material'
import { ProblemCard } from '../frame/ProblemFrame.jsx'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import FormulaInput from '../../../ui/logicpenguin/formula-input.js'
import SymbolButtonRow from '../../../ui/logicpenguin/SymbolButtonRow.jsx'
import { MobileLogicInput } from '../../../ui/LogicKeyboard/index.js'
import DerivationTable from '../../derivation/DerivationTable.jsx'
import getFormulaClass from '../../../../lib/logicpenguin/symbolic/formula.js'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'
import PromptText from '../../../ui/PromptText.jsx'

function FormulaInputField({ value, onValueChange, fieldReadOnly, formulaInputRef }) {
  const theme = useTheme()
  const containerRef = useRef(null)
  const changeHandlerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (!formulaInputRef.current) {
      const formulaInput = FormulaInput.getnew({})
      formulaInputRef.current = formulaInput
      formulaInput.style.width = '100%'
      formulaInput.style.padding = theme.spacing(1.5)
      formulaInput.style.border = `1px solid ${theme.palette.divider}`
      formulaInput.style.borderRadius = theme.shape.borderRadius
      formulaInput.style.fontSize = '1rem'
      formulaInput.style.fontFamily = 'monospace'
      formulaInput.style.backgroundColor = theme.palette.background.paper
      formulaInput.style.color = theme.palette.text.primary
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
  }, [formulaInputRef, theme])

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
        onValueChange(formulaInput.value)
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

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        minHeight: '56px',
        display: 'flex',
        alignItems: 'center',
      }}
    />
  )
}

const parseArgumentLine = (line) => {
  if (!line || typeof line !== 'string') {
    return { error: 'Enter the argument as a single line.' }
  }
  const parts = line.split('//')
  if (parts.length !== 2) {
    return { error: 'Use "//" to separate premises from the conclusion.' }
  }
  const premisesPart = parts[0].trim()
  const conclusion = parts[1].trim()
  if (!premisesPart) {
    return { error: 'Enter at least one premise before "//".' }
  }
  if (!conclusion) {
    return { error: 'Enter a conclusion after "//".' }
  }
  const premises = premisesPart
    .split('/')
    .map((premise) => premise.trim())
    .filter(Boolean)
  if (premises.length === 0) {
    return { error: 'Enter at least one premise before "//".' }
  }
  return { premises, conclusion }
}

const PREDICATE_VARIABLES = ['x', 'y', 'z']

const unique = (items) => Array.from(new Set(items.filter(Boolean)))

function getAnswerFormulas(answer) {
  if (!answer) return []
  if (answer.argument || answer.argumentLine) {
    const parsed = parseArgumentLine(answer.argument ?? answer.argumentLine)
    return parsed.error ? [] : [...parsed.premises, parsed.conclusion]
  }
  if (Array.isArray(answer.premises) && answer.conclusion != null) {
    return [...answer.premises, answer.conclusion]
  }
  if (Array.isArray(answer.translations)) {
    return answer.translations.filter(Boolean)
  }
  return []
}

function getArgumentKeyboardConfig(answer, parseStatus) {
  const formulas = parseStatus.ok && parseStatus.parsed
    ? [...parseStatus.parsed.premises, parseStatus.parsed.conclusion]
    : getAnswerFormulas(answer)
  const formulaText = formulas.map(String).join(' ')
  const predicateLetters = unique(formulaText.match(/[A-Z]/g) || [])
  const constantLetters = unique(formulaText.match(/[a-w]/g) || [])
  const variableLetters = unique(formulaText.match(/[x-z]/g) || [])
  const isPredicate =
    constantLetters.length > 0 ||
    variableLetters.length > 0 ||
    /[∀∃]/.test(formulaText) ||
    /[A-Z][a-z]/.test(formulaText)

  return isPredicate
    ? {
        isPredicateMode: true,
        predicateLetters,
        constantLetters,
        variableLetters: variableLetters.length ? variableLetters : PREDICATE_VARIABLES,
      }
    : {
        isPredicateMode: false,
        symbolizationKey: predicateLetters,
      }
}

const normalizeProof = (proofLike) => {
  if (!proofLike) return null
  if (proofLike.ans) return proofLike.ans
  return proofLike
}

function hasStartedDerivation(derivationState) {
  const snapshot = derivationState?.ans ?? derivationState
  if (!snapshot || !Array.isArray(snapshot.parts)) return false
  const subderivations = snapshot.parts.filter((part) => part && Array.isArray(part.parts))
  const targets = subderivations.length ? subderivations : snapshot.parts
  const hasContent = (nodes) => nodes.some((node) => {
    if (!node) return false
    if (Array.isArray(node.parts)) return hasContent(node.parts)
    const formula = typeof node.s === 'string' ? node.s.trim() : ''
    const justification = typeof node.j === 'string' ? node.j.trim() : ''
    return formula !== '' || justification !== ''
  })
  return hasContent(targets)
}

export default function ComboTranslationDerivation({
  proof,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const Formula = useMemo(() => getFormulaClass(), [])
  const snapshot = proof?.comboTranslationDerivation || proof?.snapshot || {}
  const promptText = snapshot?.prompt || proof?.description || ''
  const answer = proof?.answer ?? snapshot?.answer
  const [argumentLine, setArgumentLine] = useState(savedState?.argumentLine ?? '')
  const [derivationState, setDerivationState] = useState(savedState?.derivationState ?? null)
  const inputRef = useRef(null)
  const [fullScreenOpen, setFullScreenOpen] = useState(false)
  const [fullScreenFocusTarget, setFullScreenFocusTarget] = useState(null)

  useEffect(() => {
    if (savedState?.argumentLine !== undefined) {
      setArgumentLine(savedState.argumentLine)
    }
  }, [savedState?.argumentLine])

  useEffect(() => {
    setDerivationState(savedState?.derivationState ?? null)
  }, [savedState?.derivationState])

  const updateState = (updates) => {
    const state = { argumentLine, derivationState, ...updates }
    onStateChange?.(state)
  }

  const parseStatus = useMemo(() => {
    if (!argumentLine) {
      return { ok: false, reason: '', parsed: null }
    }
    const parsed = parseArgumentLine(argumentLine)
    if (parsed.error) {
      return { ok: false, reason: parsed.error, parsed: null }
    }
    try {
      parsed.premises.forEach((premise) => Formula.from(premise))
      Formula.from(parsed.conclusion)
      return { ok: true, reason: '', parsed }
    } catch {
      return { ok: false, reason: 'Fix the argument line before starting the derivation.', parsed: null }
    }
  }, [Formula, argumentLine])

  const argumentKeyboardConfig = useMemo(
    () => getArgumentKeyboardConfig(answer, parseStatus),
    [answer, parseStatus]
  )

  const derivationProof = useMemo(() => {
    if (!parseStatus.ok || !parseStatus.parsed) return null
    return {
      ...proof,
      premises: parseStatus.parsed.premises,
      conclusion: parseStatus.parsed.conclusion,
    }
  }, [parseStatus.ok, parseStatus.parsed, proof])

  const hasStartedDerivationLine = useMemo(
    () => hasStartedDerivation(derivationState),
    [derivationState]
  )

  const resetInputs = () => {
    setArgumentLine('')
    setDerivationState(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    updateState({ argumentLine: '', derivationState: null })
  }

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer: proof?.answer ?? snapshot?.answer,
      problemType: 'combo-translation-derivation',
      question: snapshot,
      options: proof?.options ?? snapshot?.options,
      getAnswer: () => ({
        argumentLine,
        proof: normalizeProof(derivationState),
        derivationState: derivationState ?? undefined,
      }),
      onComplete,
      isDisabled: () => !parseStatus.ok,
      resetInput: resetInputs,
      onStateChange: updateState,
      assignmentQuestionId,
      attemptLimit,
      initialAttemptCount: savedState?.attemptCount ?? 0,
    })

  const handleArgumentChange = (value) => {
    setArgumentLine(value)
    setDerivationState(null)
    updateState({ argumentLine: value, derivationState: null })
  }

  const handleDerivationChange = (state) => {
    setDerivationState(state)
    updateState({ derivationState: state })
  }

  const openFullScreen = useCallback((focusTarget) => {
    setFullScreenFocusTarget(focusTarget ?? null)
    setFullScreenOpen(true)
  }, [])

  const closeFullScreen = useCallback(() => {
    setFullScreenOpen(false)
    setFullScreenFocusTarget(null)
  }, [])

  const derivationProps = derivationProof
    ? {
        proof: derivationProof,
        savedState: derivationState,
        onStateChange: handleDerivationChange,
        onAttempt: () => {},
        onProofComplete: () => {},
        attemptCount,
        attemptLimit: maxAttempts,
        isChecking,
        setAttemptCount: () => {},
        setAttemptLimit: () => {},
        setStatusBanner: () => {},
        setIsChecking: () => {},
        isAssignmentLocked,
        isMobile,
        isPhone,
        onOpenFullScreen: openFullScreen,
        onCloseFullScreen: closeFullScreen,
        hideActions: true,
      }
    : null

  const fullScreenOverlay = isMobile && fullScreenOpen && derivationProps && typeof document !== 'undefined' && createPortal(
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        zIndex: 1300,
        bgcolor: 'background.paper',
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1, pb: 1, pl: 2, pr: 0, flexShrink: 0 }}>
        <IconButton
          onClick={closeFullScreen}
          aria-label="Close full screen"
          size="large"
          sx={{ color: 'text.primary' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <DerivationTable
        key={`fullscreen-${argumentLine}`}
        {...derivationProps}
        isFullScreen
        initialFocusLineIndex={fullScreenFocusTarget?.lineIndex}
        initialFocusField={fullScreenFocusTarget?.field}
      />
    </Box>,
    document.body
  )

  return (
    <>
      {fullScreenOverlay}
      <Stack spacing={3} sx={{ px: 0, width: '100%' }}>
        <ProblemCard minHeight="auto" cardSx={{ p: { xs: 2, md: 2 } }}>
          <Stack spacing={3}>
            {isInstructorView && proof && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="Edit prompt">
                  <Box component="span" onClick={openEdit} role="button" aria-label="Edit question" sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}>
                    <EditIcon fontSize="small" />
                  </Box>
                </Tooltip>
              </Box>
            )}
            {promptText && (
              <PromptText content={promptText} sx={{ whiteSpace: 'pre-line' }} />
            )}
            <Typography variant="body2" color="text.secondary">
              Enter the argument as a single line, then build a derivation for it.
            </Typography>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Argument line
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                Use "/" for separate premises and "//" for the conclusion. Example: A ⊃ B / A // B.
              </Typography>
              {isPhone ? (
                <MobileLogicInput
                  value={argumentLine}
                  onChange={handleArgumentChange}
                  placeholder="e.g. A ⊃ B / A // B"
                  aria-label="Argument line"
                  includeQuantifiers
                  symbolizationKey={argumentKeyboardConfig.symbolizationKey}
                  extraInsertButtons={[{ insert: '/' }, { insert: '//' }]}
                  predicateLetters={argumentKeyboardConfig.isPredicateMode ? argumentKeyboardConfig.predicateLetters : undefined}
                  constantLetters={argumentKeyboardConfig.isPredicateMode ? argumentKeyboardConfig.constantLetters : undefined}
                  variableLetters={argumentKeyboardConfig.isPredicateMode ? argumentKeyboardConfig.variableLetters : undefined}
                />
              ) : (
                <>
                  <FormulaInputField
                    value={argumentLine}
                    onValueChange={handleArgumentChange}
                    fieldReadOnly={false}
                    formulaInputRef={inputRef}
                  />
                  <Box sx={{ mt: 1 }}>
                    <SymbolButtonRow
                      inputRef={inputRef}
                      onValueChange={handleArgumentChange}
                    />
                  </Box>
                </>
              )}
            </Box>

            {parseStatus.ok && derivationProps && (!fullScreenOpen || !isPhone) && (
              <DerivationTable
                key={argumentLine}
                {...derivationProps}
                isFullScreen={false}
              />
            )}
          </Stack>
        </ProblemCard>

        {!parseStatus.ok && parseStatus.reason && (
          <Alert severity="info">{parseStatus.reason}</Alert>
        )}

        {isTerminalStatus(status) && (
          <StatusBanner
            status={status}
            message={message}
            onClose={() => setMessage('')}
          />
        )}

        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={!parseStatus.ok || isLocked || isAssignmentLocked || !hasStartedDerivationLine}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
        {isInstructorView && proof && (
          <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" />
        )}
      </Stack>
    </>
  )
}
