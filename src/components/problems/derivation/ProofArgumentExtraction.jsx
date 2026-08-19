import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import ProofEditor from '../ProofEditor.jsx'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import PromptText from '../../ui/PromptText.jsx'
import { ProblemCard } from '../mui/frame/ProblemFrame.jsx'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import FormulaField from '../mui/inputs/FormulaField.jsx'
import SymbolToolbar from '../mui/inputs/SymbolToolbar.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import { getNotation } from '../../../lib/logicSystems.js'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { extractLines } from './derivationUtils.js'

function hasEveryCitation(derivationState, premises, fixedLineCount) {
  const proofLines = extractLines(derivationState, premises)
  if (proofLines.length < premises.length + fixedLineCount) return false
  return proofLines
    .slice(premises.length, premises.length + fixedLineCount)
    .every((line) => String(line?.justification ?? '').trim())
}

function hasArgumentShape(value, premiseCount, Formula) {
  if (typeof value !== 'string') return false
  const pieces = value.split('//')
  if (pieces.length !== 2 || !pieces[1].trim()) return false
  const premises = pieces[0].split('/').map((part) => part.trim()).filter(Boolean)
  if (premises.length !== premiseCount) return false
  try {
    return [...premises, pieces[1].trim()].every((formula) => Formula.from(formula).wellformed)
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
    () => (Array.isArray(snapshot?.lines) ? snapshot.lines : []),
    [snapshot?.lines]
  )
  const conclusion = fixedLines.at(-1) ?? ''
  const prompt = snapshot?.prompt || proof?.description || ''
  const notation = getNotation(logicSystem)
  const Formula = useMemo(() => getFormulaClass(notation), [notation])
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
        || !hasEveryCitation(derivationState, premises, fixedLines.length)
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
    || !hasEveryCitation(derivationState, premises, fixedLines.length)

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <ProblemCard minHeight="auto" cardSx={{ p: { xs: 2, md: 2 } }}>
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

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Corresponding argument
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Use / between premises and // before the conclusion
            </Typography>
            <FormulaField
              ref={argumentInputRef}
              value={argumentLine}
              onValueChange={handleArgumentChange}
              placeholder="Enter the corresponding argument"
              extraInsertButtons={[{ insert: '/' }, { insert: '//' }]}
              logicSystem={logicSystem}
            />
            <Box sx={{ mt: 0.75 }}>
              <SymbolToolbar
                inputRef={argumentInputRef}
                onValueChange={handleArgumentChange}
                logicSystem={logicSystem}
              />
            </Box>
          </Box>
        </Stack>
      </ProblemCard>

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
