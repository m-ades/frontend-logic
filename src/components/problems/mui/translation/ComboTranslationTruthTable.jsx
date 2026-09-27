import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import SolutionReveal from '../../SolutionReveal.jsx'
import { useTheme, useMediaQuery } from '@mui/material'
import getSyntax from '@logic-app/logic-engine/symbolic/libsyntax.js'
import ProblemFrame from '../frame/ProblemFrame.jsx'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import FormulaField from '../inputs/FormulaField.jsx'
import SymbolButtonRow from '../../../ui/logic-engine/SymbolButtonRow.jsx'
import TruthTableEditor from '../../truth-table/TruthTableEditor.jsx'
import { buildTruthTableSubmissionData } from '../../truth-table/truthTableUi.js'
import getFormulaClass from '@logic-app/logic-engine/symbolic/formula.js'
import { parseArgumentLine } from '@logic-app/logic-engine/argumentLine.js'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'
import { getNotation, getSymbols } from '../../../../lib/logicSystems.js'
import { normalizeIndexedSymbols } from '../../../../lib/indexedSymbols.js'
import { parseSymbolizationKeyFromPrompt } from './symbolizationKeyboard.js'
import { formatArgumentLine, getExpectedArgument } from './argumentAnswer.js'

export default function ComboTranslationTruthTable({
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
  const allowIndexedSymbols = notation === 'calgary'
  const symbols = getSymbols(logicSystem)
  const Formula = useMemo(() => getFormulaClass(notation), [notation])
  const syntax = useMemo(() => getSyntax(notation), [notation])
  const snapshot = proof?.comboTranslationTruthTable || proof?.snapshot || {}
  const promptText = snapshot?.prompt || proof?.description || ''
  const symbolizationKey = useMemo(
    () => parseSymbolizationKeyFromPrompt(promptText, allowIndexedSymbols),
    [allowIndexedSymbols, promptText]
  )
  const [argumentLine, setArgumentLine] = useState(savedState?.argumentLine ?? '')
  const [tableState, setTableState] = useState(savedState?.tableState ?? null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (savedState?.argumentLine !== undefined) {
      setArgumentLine(savedState.argumentLine)
    }
  }, [savedState?.argumentLine])

  const updateState = (updates) => {
    const state = { argumentLine, tableState, ...updates }
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
    const quantSymbols = [syntax?.symbols?.FORALL, syntax?.symbols?.EXISTS].filter(Boolean)
    if (quantSymbols.length > 0) {
      const quantRegex = new RegExp(`[${quantSymbols.join('')}]`)
      if (quantRegex.test(argumentLine)) {
        return {
          ok: false,
          reason: 'Truth tables do not support quantifiers.',
          parsed: null,
        }
      }
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
      return { ok: false, reason: 'Fix the argument line before building the table.', parsed: null }
    }
  }, [Formula, argumentLine])

  const tableProof = useMemo(() => {
    if (!parseStatus.ok || !parseStatus.parsed) return null
    return {
      ...proof,
      truthTable: {
        kind: 'argument',
        lefts: parseStatus.parsed.premises,
        right: parseStatus.parsed.conclusion,
        options: { question: true },
      },
    }
  }, [parseStatus.ok, parseStatus.parsed, proof])

  const expectedAnswer = useMemo(
    () => getExpectedArgument(proof?.answer ?? snapshot?.answer),
    [proof?.answer, snapshot?.answer]
  )
  const answerProof = useMemo(() => {
    if (!expectedAnswer) return null
    return {
      ...proof,
      id: proof?.id ? `${proof.id}-answer` : 'answer',
      truthTable: {
        kind: 'argument',
        lefts: expectedAnswer.premises,
        right: expectedAnswer.conclusion,
        options: { question: true },
      },
    }
  }, [expectedAnswer, proof])

  const problemChecker = useProblemChecker({
    answer: proof?.answer ?? snapshot?.answer,
    problemType: 'combo-translation-truth-table',
    question: snapshot,
    options: proof?.options ?? snapshot?.options,
    getAnswer: () => {
      const payload = {
        argumentLine,
        tableAns: buildTruthTableSubmissionData(
          'argument',
          tableState?.tables?.map((table) => table.rows)
            ?? [...parseStatus.parsed.premises, parseStatus.parsed.conclusion].map(() => []),
          tableState?.mcans ?? [],
          true
        ),
      }
      if (tableState && typeof tableState === 'object') payload.tableState = tableState
      return payload
    },
    onComplete,
    isDisabled: () => !parseStatus.ok || isAssignmentLocked,
    resetInput: () => {
      setArgumentLine('')
      setTableState(null)
      updateState({ argumentLine: '', tableState: null })
    },
    onStateChange: updateState,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  const status = problemChecker.status
  const message = problemChecker.message
  const isChecking = problemChecker.isChecking
  const handleCheck = problemChecker.handleCheck
  const handleStartOver = problemChecker.handleStartOver
  const setMessage = problemChecker.setMessage
  const attemptCount = problemChecker.attemptCount
  const maxAttempts = problemChecker.maxAttempts
  const isLocked = problemChecker.isLocked

  const showSolution = attemptCount >= maxAttempts && status !== 'correct' && expectedAnswer != null
  const answerArgumentLine = expectedAnswer ? formatArgumentLine(expectedAnswer) : ''

  const handleArgumentChange = (value) => {
    setArgumentLine(value)
    setTableState(null)
    updateState({ argumentLine: value, tableState: null })
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
          isDisabled={
            !parseStatus.ok ||
            isLocked ||
            isAssignmentLocked
          }
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
        Enter the argument as a single line, then complete the truth table and classify it.
      </Typography>
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          Argument line
        </Typography>
        <FormulaField
          ref={inputRef}
          value={argumentLine}
          onValueChange={handleArgumentChange}
          placeholder={`e.g. P ${symbols.conditional} Q / P // Q`}
          aria-label="Argument line"
          symbolizationKey={symbolizationKey}
          includeQuantifiers={false}
          extraInsertButtons={[{ insert: '/' }, { insert: '//' }]}
          logicSystem={logicSystem}
        />
        {!isPhone && (
          <Box sx={{ mt: 1 }}>
            <SymbolButtonRow
              inputRef={inputRef}
              onValueChange={handleArgumentChange}
              includeQuantifiers={false}
              logicSystem={logicSystem}
            />
          </Box>
        )}
      </Box>
      {parseStatus.ok && tableProof && (
        <TruthTableEditor
          key={argumentLine}
          proof={tableProof}
          savedState={tableState}
          onStateChange={(next) => {
            setTableState(next)
            updateState({ tableState: next })
          }}
          hideActions
          suppressReveal={status === 'correct' || attemptCount < maxAttempts || showSolution}
          embedded
          parentStatus={status}
          parentAttemptCount={attemptCount}
          parentAttemptLimit={maxAttempts}
        />
      )}
      <SolutionReveal show={showSolution && Boolean(answerProof)}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          Argument line
        </Typography>
        <Typography component="div" sx={{ mb: 2, fontFamily: 'var(--app-font-mono)', fontSize: '1rem' }}>
          {answerArgumentLine}
        </Typography>
        <TruthTableEditor
          proof={answerProof}
          savedState={null}
          hideActions
          suppressReveal={false}
          embedded
          solutionOnly
          parentStatus={status}
          parentAttemptCount={attemptCount}
          parentAttemptLimit={maxAttempts}
        />
      </SolutionReveal>
    </ProblemFrame>
  )
}
