import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import ProofEditor from '../ProofEditor.jsx'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import PromptText from '../../ui/PromptText.jsx'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import FormulaField from '../mui/inputs/FormulaField.jsx'
import SymbolButtonRow from '../../ui/logicpenguin/SymbolButtonRow.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import { getNotation } from '../../../lib/logicSystems.js'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { parseExtractionArgument } from '../../../lib/proofArgumentExtractionArgument.js'
import {
  getAssumptionDepths,
  getAssumptionRuleRequirements,
  parseAssumptionScopes,
} from '../../../lib/proofArgumentExtractionScopes.js'
import { extractLines } from './derivationUtils.js'
import { getFormulaKeyboardConfig } from '../mui/translation/symbolizationKeyboard.js'
import DerivationCard from './DerivationCard.jsx'

const ARGUMENT_SEPARATOR_BUTTONS = [
  { insert: ' ∴ ', label: '∴' },
]

function getQuestionLines(snapshot, logicSystem) {
  const formulas = Array.isArray(snapshot?.lines) ? snapshot.lines : []
  const supplied = Array.isArray(snapshot?.justifications) ? snapshot.justifications : []
  const { scopes } = parseAssumptionScopes(
    snapshot?.assumptionScopes,
    formulas.length,
    logicSystem
  )
  const depths = getAssumptionDepths(scopes, formulas.length)
  const scopeStarts = new Set(scopes.map(({ start }) => start))
  const requiredRules = new Map(
    getAssumptionRuleRequirements(scopes, logicSystem)
      .map(({ line, rules }) => [line, rules])
  )
  return formulas.map((formula, index) => ({
    formula,
    justification: String(supplied[index] ?? '').trim(),
    scopeDepth: depths[index],
    startsScope: scopeStarts.has(index),
    requiredRules: requiredRules.get(index) ?? null,
  }))
}

function hasEveryCitation(derivationState, premises, fixedLines) {
  const proofLines = extractLines(derivationState, premises)
  return fixedLines.map((line, index) => (
    line.justification
    || String(proofLines[premises.length + index]?.justification ?? '').trim()
  )).every(Boolean)
}

function hasArgumentShape(value, premiseCount, Formula) {
  const parsed = parseExtractionArgument(value)
  if (!parsed || parsed.premises.length !== premiseCount) return false
  try {
    return [...parsed.premises, parsed.conclusion]
      .every((formula) => Formula.from(formula).wellformed)
  } catch {
    return false
  }
}

function unwrapProof(state) {
  return state?.ans ?? state ?? null
}

function getSavedDerivationState(savedState) {
  if (savedState?.derivationState !== undefined) return savedState.derivationState
  if (savedState?.proof) return { ans: savedState.proof }
  return null
}

// prems are fixed premises and lines are fixed derived formulas with the conclusion last
// student state owns only citations and argument text while the backend owns every formula
export default function ProofArgumentExtraction({
  proof,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
  problemLabel,
  logicSystem,
}) {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const editorRef = useRef(null)
  const argumentInputRef = useRef(null)
  const [resetVersion, setResetVersion] = useState(0)
  const snapshot = proof?.questionSnapshot
    ?? proof?.snapshot
    ?? proof
    ?? {}
  const premises = useMemo(
    () => (Array.isArray(snapshot?.prems) ? snapshot.prems : []),
    [snapshot?.prems]
  )
  const fixedLines = useMemo(
    () => getQuestionLines(snapshot, logicSystem),
    [logicSystem, snapshot?.assumptionScopes, snapshot?.justifications, snapshot?.lines]
  )
  const conclusion = fixedLines.at(-1)?.formula ?? ''
  const prompt = snapshot?.prompt || proof?.description || ''
  const notation = getNotation(logicSystem)
  const Formula = useMemo(() => getFormulaClass(notation), [notation])
  const argumentKeyboardConfig = useMemo(() => (
    getFormulaKeyboardConfig(
      [...premises, ...fixedLines.map((line) => line.formula)],
      notation === 'calgary'
    ) ?? { isPredicateMode: false, symbolizationKey: [] }
  ), [fixedLines, notation, premises])
  const [argumentLine, setArgumentLine] = useState(savedState?.argumentLine ?? '')
  const [derivationState, setDerivationState] = useState(() => getSavedDerivationState(savedState))

  useEffect(() => {
    if (savedState?.argumentLine !== undefined) setArgumentLine(savedState.argumentLine)
  }, [savedState?.argumentLine])

  useEffect(() => {
    setDerivationState(getSavedDerivationState(savedState))
  }, [savedState?.derivationState, savedState?.proof])

  const emitState = useCallback((updates = {}) => {
    onStateChange?.({ argumentLine, derivationState, ...updates })
  }, [argumentLine, derivationState, onStateChange])

  const handleArgumentChange = useCallback((value) => {
    setArgumentLine(value)
    emitState({ argumentLine: value })
  }, [emitState])

  const handleDerivationChange = useCallback((state) => {
    setDerivationState(state)
    emitState({ derivationState: state })
  }, [emitState])

  const resetInputs = useCallback(() => {
    setArgumentLine('')
    setDerivationState(null)
    setResetVersion((value) => value + 1)
    onStateChange?.({ argumentLine: '', derivationState: null })
  }, [onStateChange])

  const handleCheckerStateChange = useCallback((state) => {
    // the shared reset sends a second empty answer after this problem has already cleared both fields
    if (state && Object.keys(state).length === 1 && state.ans === undefined) return
    emitState(state)
  }, [emitState])

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer: null,
      problemType: 'proof-argument-extraction',
      question: snapshot,
      options: { ...(proof?.options || snapshot?.options || {}), logicSystem, notation },
      getAnswer: () => ({
        argumentLine,
        proof: unwrapProof(derivationState),
      }),
      onComplete,
      isDisabled: () => (
        !hasArgumentShape(argumentLine, premises.length, Formula)
        || !hasEveryCitation(derivationState, premises, fixedLines)
      ),
      resetInput: resetInputs,
      onStateChange: handleCheckerStateChange,
      assignmentQuestionId,
      attemptLimit,
      initialAttemptCount: savedState?.attemptCount ?? 0,
    })

  const derivationProof = useMemo(() => ({
    ...proof,
    premises,
    conclusion,
    ruleset: snapshot?.ruleset || proof?.ruleset,
    options: snapshot?.options || proof?.options,
    description: '',
  }), [conclusion, premises, proof, snapshot?.options, snapshot?.ruleset])
  const derivationKey = `${resetVersion}-${JSON.stringify(premises)}-${JSON.stringify(fixedLines)}`

  const submitDisabled = isLocked
    || isAssignmentLocked
    || !hasArgumentShape(argumentLine, premises.length, Formula)
    || !hasEveryCitation(derivationState, premises, fixedLines)

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <DerivationCard>
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              {problemLabel && (
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.2, mb: 1.5 }}>
                  {problemLabel}
                </Typography>
              )}
              {prompt && <PromptText content={prompt} />}
            </Box>
            {isInstructorView && (
              <Tooltip title="Edit question">
                <IconButton size="small" onClick={() => editorRef.current?.open?.()} aria-label="Edit question">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <ProofEditor
            key={derivationKey}
            proof={derivationProof}
            savedState={derivationState}
            onStateChange={handleDerivationChange}
            onProofComplete={() => {}}
            isAssignmentLocked={isAssignmentLocked}
            fixedLines={fixedLines}
            hideActions
            logicSystem={logicSystem}
          />

          <Box sx={{ width: '100%', maxWidth: '34rem' }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Corresponding argument
            </Typography>
            <FormulaField
              ref={argumentInputRef}
              value={argumentLine}
              onValueChange={handleArgumentChange}
              aria-label="Corresponding argument"
              placeholder="e.g. P, Q ∴ R"
              symbolizationKey={argumentKeyboardConfig.symbolizationKey}
              includeQuantifiers={argumentKeyboardConfig.isPredicateMode}
              extraInsertButtons={ARGUMENT_SEPARATOR_BUTTONS}
              predicateLetters={argumentKeyboardConfig.isPredicateMode
                ? argumentKeyboardConfig.predicateLetters
                : undefined}
              constantLetters={argumentKeyboardConfig.isPredicateMode
                ? argumentKeyboardConfig.constantLetters
                : undefined}
              variableLetters={argumentKeyboardConfig.isPredicateMode
                ? argumentKeyboardConfig.variableLetters
                : undefined}
              allowTherefore
              logicSystem={logicSystem}
            />
            {!isPhone && (
              <Box sx={{ mt: 0.75 }}>
                <SymbolButtonRow
                  inputRef={argumentInputRef}
                  onValueChange={handleArgumentChange}
                  includeQuantifiers={argumentKeyboardConfig.isPredicateMode}
                  extraInsertButtons={ARGUMENT_SEPARATOR_BUTTONS}
                  logicSystem={logicSystem}
                />
              </Box>
            )}
          </Box>
        </Stack>
      </DerivationCard>

      {isTerminalStatus(status) && (
        <StatusBanner status={status} message={message} onClose={() => setMessage('')} />
      )}

      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={submitDisabled}
        align="flex-start"
        attemptCount={attemptCount}
        attemptLimit={maxAttempts}
        isInstructorView={isInstructorView}
      />

      {isInstructorView && (
        <InstructorQuestionEditor
          ref={editorRef}
          proof={proof}
          isInstructorView
          onSaved={onQuestionSaved}
          trigger="none"
          logicSystem={logicSystem}
        />
      )}
    </Stack>
  )
}
