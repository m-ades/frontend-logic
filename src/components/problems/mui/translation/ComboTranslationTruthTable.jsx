import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import getSyntax from '../../../../lib/logicpenguin/symbolic/libsyntax.js'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import ProblemFrame, { ProblemCard, sectionLabelSx } from '../frame/ProblemFrame.jsx'
import FormulaField from '../inputs/FormulaField.jsx'
import SymbolToolbar from '../inputs/SymbolToolbar.jsx'
import TruthTableEditor from '../../truth-table/TruthTableEditor.jsx'
import getFormulaClass from '../../../../lib/logicpenguin/symbolic/formula.js'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'

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

const buildTableAnswer = (tableState) => {
  if (!tableState?.tables?.length) return null
  const toBool = (cell) => cell === 'T'
  const mapRows = (rows) => rows.map((row) => row.map(toBool))
  const mapped = tableState.tables.map((t) => ({
    rows: mapRows(t.rows || []),
    colhls: t.rows?.[0]?.length ? Array(t.rows[0].length).fill(false) : [],
  }))
  if (mapped.length === 1) return { lefts: [], right: mapped[0], rowhls: [] }
  return {
    lefts: mapped.slice(0, -1),
    right: mapped[mapped.length - 1],
    rowhls: [],
    mcans: tableState.mcans ?? [],
    valid: tableState.mcans?.includes('valid'),
  }
}

const isTableComplete = (tableState) =>
  tableState?.tables?.every((t) =>
    t.rows?.every((row) => row?.every((cell) => cell !== ''))
  ) ?? false

const hasClassification = (tableState) =>
  Array.isArray(tableState?.mcans) && tableState.mcans.length > 0

function resolveExpectedAnswer(answer) {
  if (!answer) return null
  if (answer.argument || answer.argumentLine) {
    const parsed = parseArgumentLine(answer.argument ?? answer.argumentLine)
    return parsed.error ? null : parsed
  }
  if (Array.isArray(answer.premises) && answer.conclusion != null) {
    return { premises: answer.premises, conclusion: answer.conclusion }
  }
  if (Array.isArray(answer.translations) && Number.isInteger(answer.index)) {
    const conclusion = answer.translations[answer.index] ?? ''
    const premises = answer.translations.filter((_, idx) => idx !== answer.index)
    return premises.length && conclusion ? { premises, conclusion } : null
  }
  return null
}

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
}) {
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const Formula = useMemo(() => getFormulaClass(), [])
  const syntax = useMemo(() => getSyntax(), [])
  const snapshot = proof?.comboTranslationTruthTable || proof?.snapshot || {}
  const promptText = snapshot?.prompt || proof?.description || ''
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
    onStateChange?.(state)
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
  }, [Formula, argumentLine, syntax])

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
    () => resolveExpectedAnswer(proof?.answer ?? snapshot?.answer),
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
      const payload = { argumentLine }
      const built = buildTableAnswer(tableState)
      if (built) payload.tableAns = built
      if (tableState && typeof tableState === 'object') payload.tableState = tableState
      return payload
    },
    onComplete,
    isDisabled: () =>
      !parseStatus.ok ||
      !tableState ||
      !isTableComplete(tableState) ||
      !hasClassification(tableState),
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
  const answerArgumentLine = expectedAnswer
    ? expectedAnswer.premises.join(' / ') + ' // ' + expectedAnswer.conclusion
    : ''

  const handleArgumentChange = (value) => {
    setArgumentLine(value)
    setTableState(null)
    updateState({ argumentLine: value, tableState: null })
  }

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={promptText}
      promptSx={{ whiteSpace: 'pre-line' }}
      cardMaxWidth="1060px"
      isInstructorView={isInstructorView && !!proof}
      onEditQuestion={proof ? openEdit : undefined}
      status={status}
      message={message}
      onCloseStatus={() => setMessage('')}
      actionNode={(
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={
            !parseStatus.ok ||
            !tableState ||
            !isTableComplete(tableState) ||
            !hasClassification(tableState) ||
            isLocked ||
            isAssignmentLocked
          }
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      )}
      editorNode={isInstructorView && proof ? (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" />
      ) : null}
    >
      <Typography variant="body2" sx={sectionLabelSx}>
        Enter the argument as a single line, then complete the truth table and classify it.
      </Typography>
      <Box>
        <Typography variant="body2" sx={{ ...sectionLabelSx, mb: 1, fontWeight: 600, color: 'text.primary' }}>
          Argument line
        </Typography>
        <FormulaField value={argumentLine} onValueChange={handleArgumentChange} ref={inputRef} />
        <Box sx={{ mt: 1 }}>
          <SymbolToolbar
            inputRef={inputRef}
            onValueChange={handleArgumentChange}
            includeQuantifiers={false}
          />
        </Box>
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
      {showSolution && answerProof && (
        <ProblemCard
          minHeight="auto"
          cardSx={{ borderColor: 'primary.main', borderWidth: 1, borderStyle: 'solid', p: 2 }}
        >
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Correct Answer
            </Typography>
            <Typography variant="body2" sx={{ ...sectionLabelSx, mb: 0, fontWeight: 600, color: 'text.primary' }}>
              Argument line
            </Typography>
            <Typography component="div" sx={{ fontFamily: 'monospace', fontSize: '1rem' }}>
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
          </Stack>
        </ProblemCard>
      )}
    </ProblemFrame>
  )
}
