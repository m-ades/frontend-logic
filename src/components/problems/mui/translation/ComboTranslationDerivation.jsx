import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import SolutionReveal from '../../SolutionReveal.jsx'
import { useTheme, useMediaQuery } from '@mui/material'
import ProblemFrame from '../frame/ProblemFrame.jsx'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import FormulaField from '../inputs/FormulaField.jsx'
import SymbolButtonRow from '../../../ui/logic-engine/SymbolButtonRow.jsx'
import ProofEditor from '../../ProofEditor.jsx'
import getFormulaClass from '@logic-app/logic-engine/symbolic/formula.js'
import { parseArgumentLine } from '@logic-app/logic-engine/argumentLine.js'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'
import { getNotation, getSymbols } from '../../../../lib/logicSystems.js'
import {
  displayIndexedSymbolsForNotation,
  normalizeIndexedSymbols,
} from '../../../../lib/indexedSymbols.js'
import {
  ST_PREDICATE_VARIABLES,
  getConstantLettersFromKey,
  getFormulaKeyboardConfig,
  getPredicateLettersFromKey,
  isPredicateLogicKey,
  parseSymbolizationKeyFromPrompt,
  promptImpliesPredicateLogic,
} from './symbolizationKeyboard.js'
import {
  formatArgumentLine,
  getExpectedArgument,
  isWellformedArgument,
  unwrapAnswer,
} from './argumentAnswer.js'

function getAnswerFormulas(source) {
  const expected = getExpectedArgument(source)
  if (expected) return [...expected.premises, expected.conclusion]
  // translation lists without a conclusion index still supply keyboard letters
  const translations = unwrapAnswer(source)?.translations
  return Array.isArray(translations) ? translations.filter(Boolean) : []
}

function firstWithFormulas(...candidates) {
  for (const candidate of candidates) {
    if (getAnswerFormulas(candidate).length > 0) return candidate
  }
  return null
}

function getAnswerArgumentLine(source) {
  const expected = getExpectedArgument(source)
  return expected ? formatArgumentLine(expected) : ''
}

function getArgumentKeyboardConfig(
  answer,
  symbolizationKey,
  prompt,
  argumentLine,
  allowIndexedSymbols
) {
  const answerFormulas = getAnswerFormulas(answer)
  const formulas = answerFormulas.length > 0
    ? answerFormulas
    : getAnswerFormulas(argumentLine)
  const formulaKeyboardConfig = getFormulaKeyboardConfig(formulas, allowIndexedSymbols)
  if (formulaKeyboardConfig) return formulaKeyboardConfig
  if (symbolizationKey.length > 0) {
    const isPredicate = isPredicateLogicKey(symbolizationKey, allowIndexedSymbols) || promptImpliesPredicateLogic(prompt)
    const predicateLetters = getPredicateLettersFromKey(symbolizationKey, allowIndexedSymbols)
    const constantsFromKey = getConstantLettersFromKey(symbolizationKey, allowIndexedSymbols)
    const constantLetters = isPredicate
      ? (constantsFromKey.length > 0 ? constantsFromKey : [])
      : []
    const variableLetters = isPredicate ? ST_PREDICATE_VARIABLES : []
    return isPredicate
      ? {
          isPredicateMode: true,
          predicateLetters,
          constantLetters,
          variableLetters,
        }
      : {
          isPredicateMode: false,
          symbolizationKey,
        }
  }
  return {
    isPredicateMode: true,
    predicateLetters: [],
    constantLetters: [],
    variableLetters: [],
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
  problemLabel,
  logicSystem,
}) {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const notation = getNotation(logicSystem)
  const symbols = getSymbols(logicSystem)
  const allowIndexedSymbols = notation === 'calgary'
  const Formula = useMemo(() => getFormulaClass(notation), [notation])
  const canonicalizeArgumentLine = useCallback((value) => {
    // saved lines come back with ascii indices so even partial lines need display form
    const displayed = displayIndexedSymbolsForNotation(value, notation)
    const parsed = parseArgumentLine(value)
    if (parsed.error) return displayed
    const premises = parsed.premises.map((premise) => Formula.from(premise))
    const conclusion = Formula.from(parsed.conclusion)
    if (premises.some((formula) => !formula.wellformed) || !conclusion.wellformed) {
      return displayed
    }
    const canonical = `${premises.map((formula) => formula.normal).join(' / ')} // ${conclusion.normal}`
    return displayIndexedSymbolsForNotation(canonical, notation)
  }, [Formula, notation])
  const snapshot = proof?.comboTranslationDerivation || proof?.snapshot || proof?.questionSnapshot || proof?.question_snapshot || proof || {}
  const promptText = snapshot?.prompt || proof?.description || ''
  const symbolizationKey = useMemo(
    () => parseSymbolizationKeyFromPrompt(promptText, allowIndexedSymbols),
    [allowIndexedSymbols, promptText]
  )
  const answer = firstWithFormulas(
    proof?.answer,
    snapshot?.answer,
    proof?.questionSnapshot?.answer,
    proof?.question_snapshot?.answer,
    snapshot
  ) ?? proof?.answer ?? snapshot?.answer
  const answerArgumentLine = useMemo(() => {
    const line = getAnswerArgumentLine(answer)
    return line ? canonicalizeArgumentLine(line) : ''
  }, [answer, canonicalizeArgumentLine])
  const [argumentLine, setArgumentLine] = useState(
    () => canonicalizeArgumentLine(savedState?.argumentLine ?? '')
  )
  const [derivationState, setDerivationState] = useState(savedState?.derivationState ?? null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (savedState?.argumentLine !== undefined) {
      setArgumentLine(canonicalizeArgumentLine(savedState.argumentLine))
    }
  }, [canonicalizeArgumentLine, savedState?.argumentLine])

  useEffect(() => {
    setDerivationState(savedState?.derivationState ?? null)
  }, [savedState?.derivationState])

  const updateState = (updates) => {
    const state = { argumentLine, derivationState, ...updates }
    onStateChange?.({
      ...state,
      argumentLine: allowIndexedSymbols
        ? normalizeIndexedSymbols(state.argumentLine)
        : state.argumentLine,
    })
  }

  const parseStatus = useMemo(() => {
    if (!argumentLine) {
      return { ok: false, reason: '', parsed: null }
    }
    const parsed = parseArgumentLine(argumentLine)
    if (parsed.error) {
      return { ok: false, reason: parsed.error, parsed: null }
    }
    if (!isWellformedArgument(parsed, Formula)) {
      return { ok: false, reason: 'Fix the argument line before starting the derivation.', parsed: null }
    }
    return { ok: true, reason: '', parsed }
  }, [Formula, argumentLine])

  const argumentKeyboardConfig = useMemo(
    () => getArgumentKeyboardConfig(
      answer,
      symbolizationKey,
      promptText,
      argumentLine,
      allowIndexedSymbols
    ),
    [allowIndexedSymbols, answer, argumentLine, promptText, symbolizationKey]
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
    updateState({ argumentLine: '', derivationState: null })
  }

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer,
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
  const showSolution = isLocked && status !== 'correct' && Boolean(answerArgumentLine)

  const handleArgumentChange = (value) => {
    setArgumentLine(value)
    setDerivationState(null)
    updateState({ argumentLine: value, derivationState: null })
  }
  const handleArgumentBlur = () => {
    const canonical = canonicalizeArgumentLine(argumentLine)
    if (canonical !== argumentLine) handleArgumentChange(canonical)
  }

  const handleDerivationChange = (state) => {
    setDerivationState(state)
    updateState({ derivationState: state })
  }

  return (
    <ProblemFrame
      expandForContent
      problemLabel={problemLabel}
      prompt={promptText}
      promptSx={{ whiteSpace: 'pre-line' }}
      isInstructorView={isInstructorView && Boolean(proof)}
      onEditQuestion={openEdit}
      status={status}
      message={message}
      onCloseStatus={() => setMessage('')}
      actionNode={
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
      }
      editorNode={isInstructorView && proof ? (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" logicSystem={logicSystem} />
      ) : null}
    >
      <Typography variant="body2" color="text.secondary">
        Enter the argument as a single line, then build a derivation for it.
      </Typography>
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          Argument line
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
          Use "/" for separate premises and "//" for the conclusion. Example: A {symbols.conditional} B / A // B.
        </Typography>
        <FormulaField
          ref={inputRef}
          value={argumentLine}
          onValueChange={handleArgumentChange}
          onBlur={handleArgumentBlur}
          placeholder={`e.g. A ${symbols.conditional} B / A // B`}
          aria-label="Argument line"
          symbolizationKey={argumentKeyboardConfig.symbolizationKey}
          extraInsertButtons={[{ insert: '/' }, { insert: '//' }]}
          predicateLetters={argumentKeyboardConfig.isPredicateMode ? argumentKeyboardConfig.predicateLetters : undefined}
          constantLetters={argumentKeyboardConfig.isPredicateMode ? argumentKeyboardConfig.constantLetters : undefined}
          variableLetters={argumentKeyboardConfig.isPredicateMode ? argumentKeyboardConfig.variableLetters : undefined}
          logicSystem={logicSystem}
        />
        {!isPhone && (
          <Box sx={{ mt: 1 }}>
            <SymbolButtonRow
              inputRef={inputRef}
              onValueChange={handleArgumentChange}
              logicSystem={logicSystem}
            />
          </Box>
        )}
      </Box>
      {!parseStatus.ok && parseStatus.reason && (
        <Alert severity="info">{parseStatus.reason}</Alert>
      )}
      {parseStatus.ok && derivationProof && (
        <ProofEditor
          key={argumentLine}
          proof={derivationProof}
          savedState={derivationState}
          onStateChange={handleDerivationChange}
          onProofComplete={() => {}}
          isAssignmentLocked={isAssignmentLocked}
          hideActions
          logicSystem={logicSystem}
        />
      )}
      <SolutionReveal show={showSolution}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          Argument line
        </Typography>
        <Typography component="div" sx={{ fontFamily: 'var(--app-font-mono)', fontSize: '1rem' }}>
          {answerArgumentLine}
        </Typography>
      </SolutionReveal>
    </ProblemFrame>
  )
}
