import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { libtf } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import { getTokenSpeechLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import ProblemFrame from '../mui/frame/ProblemFrame.jsx'
import TruthTableGrid from './TruthTableGrid.jsx'
import TruthTableSection from './TruthTableSection.jsx'
import { tokenizeTruthTableHeader } from './truthTableUi.js'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import { rowsEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'

const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1) return 'T'
  if (value === false || value === 'F' || value === 'f' || value === 0) return 'F'
  return ''
}
const toBoolean = (value) => (value === 'T' ? true : value === 'F' ? false : null)

export default function SingleRowTruthTable({
  problem,
  proof,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  readOnly = false,
  hideActions = false,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
  problemLabel,
}) {
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const syntax = useMemo(() => getSyntax(), [])
  const Formula = useMemo(() => getFormulaClass(), [])
  const statement = problem?.statement || problem?.prompt || ''
  const prompt = problem?.prompt && problem?.prompt !== statement ? problem.prompt : ''
  const interpretation = useMemo(() => problem?.interpretation ?? {}, [problem?.interpretation])
  const operatorSet = useMemo(() => new Set(Object.keys(syntax.operators)), [syntax])

  const evaluation = useMemo(() => {
    if (!statement) return null
    const wff = Formula.from(statement)
    const evalWithTokens = (formula, interp) => {
      const tfn = formula.op ? libtf.tfns[syntax.operators[formula.op]] : false
      const isBinary = syntax.isbinaryop(formula.op)
      const isMono = syntax.ismonop(formula.op)

      if (!isBinary && !isMono) {
        const tv = formula.op ? tfn() : (interp[formula.pletter] ?? false)
        return { tv, row: [tv], tokens: [formula.normal] }
      }

      if (isBinary) {
        const lres = evalWithTokens(formula.left, interp)
        const rres = evalWithTokens(formula.right, interp)
        const tv = tfn(lres.tv, rres.tv)
        return {
          tv,
          row: [...lres.row, tv, ...rres.row],
          tokens: [...lres.tokens, formula.op, ...rres.tokens],
        }
      }

      const rres = evalWithTokens(formula.right, interp)
      const tv = tfn(rres.tv)
      return { tv, row: [tv, ...rres.row], tokens: [formula.op, ...rres.tokens] }
    }

    return evalWithTokens(wff, interpretation)
  }, [Formula, interpretation, statement, syntax])

  const tokens = evaluation?.tokens || []
  const headerTokens = useMemo(() => {
    return tokenizeTruthTableHeader(statement, syntax)
  }, [statement, syntax])
  const expectedRow = (evaluation?.row || []).map(toSymbol)
  const expectedCompound = toSymbol(evaluation?.tv)

  const isAtomicToken = useCallback((token) => {
    if (!token) return false
    const stripped = token.replace(/[()\[\]{}]/g, '')
    if (stripped.length !== 1) return false
    return !operatorSet.has(stripped)
  }, [operatorSet])

  const initialRow = useMemo(
    () =>
      tokens.map((token, idx) => {
        if (isAtomicToken(token)) {
          return toSymbol(interpretation?.[token])
        }
        if (savedState?.row?.[idx] !== undefined) {
          return savedState.row[idx]
        }
        return ''
      }),
    [interpretation, isAtomicToken, savedState?.row, tokens]
  )
  const resetRow = useMemo(
    () =>
      tokens.map((token) =>
        isAtomicToken(token) ? toSymbol(interpretation?.[token]) : ''
      ),
    [interpretation, isAtomicToken, tokens]
  )

  const [rowInputs, setRowInputs] = useState(() => initialRow)
  const [compoundInput, setCompoundInput] = useState(
    savedState?.compound !== undefined ? toSymbol(savedState.compound) : ''
  )
  const [selectedColumns, setSelectedColumns] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const onStateChangeTimerRef = useRef(null)

  useEffect(() => {
    setRowInputs((prev) => (rowsEqual(prev, initialRow) ? prev : initialRow))
  }, [initialRow])

  useEffect(() => {
    setCompoundInput(
      savedState?.compound !== undefined ? toSymbol(savedState.compound) : ''
    )
  }, [savedState?.compound])

  useEffect(() => () => clearDebounce(onStateChangeTimerRef), [])

  const scheduleStateChange = useCallback((next) => {
    scheduleDebouncedChange(onStateChangeTimerRef, onStateChange, next)
  }, [onStateChange])
  const buildDraftState = useCallback((nextRow, nextCompound) => ({
    row: nextRow,
    compound: nextCompound,
  }), [])

  const isDisabled = useCallback(() =>
    rowInputs.length === 0 ||
    rowInputs.some((cell, idx) => cell === '' && !isAtomicToken(tokens[idx])) ||
    compoundInput === '',
  [compoundInput, isAtomicToken, rowInputs, tokens])

  const { status, message, isChecking, handleCheck, handleStartOver, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer: expectedRow,
    problemType: 'single-row-truth-table',
    question: problem,
    getAnswer: () => ({
      row: rowInputs.map(toBoolean),
      compound: toBoolean(compoundInput),
    }),
    onComplete,
    isDisabled,
    resetInput: () => {
      setRowInputs(resetRow)
      setCompoundInput('')
      onStateChange?.(buildDraftState(resetRow, ''))
    },
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  const handleCellChange = (index, value) => {
    if (readOnly || isLocked) return
    if (isAtomicToken(tokens[index])) return
    const next = [...rowInputs]
    next[index] = value
    setRowInputs(next)
    setStatus('unanswered')
    setMessage('')
    scheduleStateChange(buildDraftState(next, compoundInput))
  }

  const handleCompoundChange = (value) => {
    if (readOnly || isLocked) return
    const nextValue = value || ''
    setCompoundInput(nextValue)
    scheduleStateChange(buildDraftState(rowInputs, nextValue))
    setStatus('unanswered')
    setMessage('')
  }

  const toggleColumn = (_tableIndex, colIndex) => {
    setSelectedColumns((prev) => (
      prev.some((entry) => entry.tableIndex === 0 && entry.colIndex === colIndex)
        ? prev.filter((entry) => !(entry.tableIndex === 0 && entry.colIndex === colIndex))
        : [...prev, { tableIndex: 0, colIndex }]
    ))
  }
  const toggleRow = (rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((entry) => entry !== rowIndex) : [...prev, rowIndex]
    )
  }
  const columns = useMemo(
    () => (headerTokens.length > 0 ? headerTokens : tokens).map((token) => ({ token, ariaLabel: getTokenSpeechLabel(token) })),
    [headerTokens, tokens]
  )
  const gridTables = useMemo(
    () => [{ tokens, headerTokens: columns.map((column) => column.token), rows: [expectedRow] }],
    [columns, expectedRow, tokens]
  )
  const gridInputs = useMemo(() => [[rowInputs]], [rowInputs])
  const compoundTables = useMemo(
    () => [{ tokens: [statement], headerTokens: [statement], rows: [[expectedCompound]] }],
    [expectedCompound, statement]
  )
  const compoundInputs = useMemo(() => [[[compoundInput]]], [compoundInput])
  const compoundAnswerInputs = useMemo(() => [[[expectedCompound]]], [expectedCompound])

  const formatInterpretation = () => {
    const entries = Object.entries(interpretation)
    if (!entries.length) return ''
    return entries
      .map(([key, value]) => `${key} = ${value ? 'T' : 'F'}`)
      .join(', ')
  }

  const renderTableSet = (tableInputsToRender, readOnlyTable) => (
    <TruthTableGrid
      tables={gridTables}
      tableInputs={tableInputsToRender}
      combined={false}
      readOnly={readOnlyTable}
      isCellReadOnly={({ colIndex }) => isAtomicToken(tokens[colIndex])}
      selectedColumns={selectedColumns}
      selectedRows={selectedRows}
      onToggleColumn={toggleColumn}
      onToggleRow={toggleRow}
      onCellChange={(_, __, colIndex, value) => handleCellChange(colIndex, value)}
    />
  )

  if (!statement) {
    return <Typography color="error">Invalid problem</Typography>
  }

  const tableFilled = rowInputs.length > 0 && !isDisabled()
  const isCurrentlyCorrect = tableFilled &&
    rowInputs.length === expectedRow.length &&
    rowInputs.every((cell, idx) => cell === expectedRow[idx]) &&
    compoundInput === expectedCompound

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={prompt}
      minHeight="260px"
      cardMaxWidth="1060px"
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
          isDisabled={!tableFilled || isLocked || isAssignmentLocked}
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
      {formatInterpretation() && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Interpretation: {formatInterpretation()}
        </Typography>
      )}
      {renderTableSet(gridInputs, false)}
      <TruthTableSection title="Truth value of compound statement">
        <TruthTableGrid
          tables={compoundTables}
          tableInputs={compoundInputs}
          combined={false}
          readOnly={readOnly || isLocked}
          withSelectors={false}
          onCellChange={(_, __, ___, value) => handleCompoundChange(value)}
        />
      </TruthTableSection>
      {isLocked && status !== 'correct' && expectedRow.length > 0 && (
        <TruthTableSection title="Correct Answer">
          <Box sx={{ display: 'grid', gap: 2 }}>
            {renderTableSet([[expectedRow]], true)}
            <TruthTableGrid
              tables={compoundTables}
              tableInputs={compoundAnswerInputs}
              combined={false}
              readOnly
              withSelectors={false}
            />
          </Box>
        </TruthTableSection>
      )}
      <Typography
        variant="body2"
        sx={{
          color: 'primary.main',
          fontFamily: 'inherit',
          fontWeight: 400,
        }}
      >
        {status === 'correct' || isCurrentlyCorrect
          ? 'Truth table looks good.'
          : tableFilled
            ? 'Recheck your truth values.'
            : 'Click editable cells to toggle truth values - fill in every blank cell to finish.'}
      </Typography>
    </ProblemFrame>
  )
}
