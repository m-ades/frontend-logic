import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TableCell,
  alpha,
} from '@mui/material'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import { useTheme } from '@mui/material/styles'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import ProblemFrame from '../mui/frame/ProblemFrame.jsx'
import TruthTableGrid from './TruthTableGrid.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import { rowsEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'
import { getNotation } from '../../../lib/logicSystems.js'

const toTruth = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1) return true
  if (value === false || value === 'F' || value === 'f' || value === 0) return false
  return null
}

const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't') return 'T'
  if (value === false || value === 'F' || value === 'f') return 'F'
  if (value === 'U' || value === 'u' || value === '?') return 'U'
  return ''
}

export default function PartialTruthTable({
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
  logicSystem,
}) {
  const theme = useTheme()
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const notation = getNotation(logicSystem)
  const Formula = useMemo(() => getFormulaClass(notation), [notation])
  const statement = problem?.statement || problem?.formula || ''
  const prompt = problem?.prompt || ''
  const givenRow = Array.isArray(problem?.row) ? problem.row : []
  const tokens = useMemo(() => {
    if (!statement) return []
    const wff = Formula.from(statement)
    const tables = multiTables([wff], notation)
    return tables?.tables?.[0]?.tokens ?? []
  }, [Formula, notation, statement])

  const editableIndices = useMemo(
    () => tokens.map((_, idx) => toTruth(givenRow[idx]) === null),
    [givenRow, tokens]
  )

  const initialRow = useMemo(
    () =>
      tokens.map((_, idx) => {
        const given = toTruth(givenRow[idx])
        if (given !== null) {
          return toSymbol(givenRow[idx])
        }
        const saved = savedState?.row?.[idx]
        return saved ? toSymbol(saved) : ''
      }),
    [givenRow, savedState?.row, tokens]
  )

  const [rowInputs, setRowInputs] = useState(() => initialRow)
  const [selectedColumns, setSelectedColumns] = useState([])
  const onStateChangeTimerRef = useRef(null)

  useEffect(() => () => clearDebounce(onStateChangeTimerRef), [])

  useEffect(() => {
    setRowInputs((prev) => (rowsEqual(prev, initialRow) ? prev : initialRow))
  }, [initialRow])

  const isDisabled = useCallback(
    () =>
      rowInputs.length === 0 ||
      rowInputs.some((cell, idx) => editableIndices[idx] && cell === ''),
    [editableIndices, rowInputs]
  )

  const { status, message, isChecking, handleCheck, handleStartOver, setStatus, setMessage, attemptCount, maxAttempts, isLocked } = useProblemChecker({
    answer: null,
    problemType: 'partial-truth-table',
    question: problem,
    getAnswer: () => ({ row: rowInputs }),
    onComplete,
    isDisabled,
    resetInput: () => {
      setRowInputs(initialRow)
      onStateChange?.({ row: initialRow })
    },
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  const handleCellChange = (index, value) => {
    if (readOnly) return
    setRowInputs((prev) => {
      const next = [...prev]
      next[index] = value
      scheduleDebouncedChange(onStateChangeTimerRef, onStateChange, { row: next })
      return next
    })
    setStatus('unanswered')
    setMessage('')
  }

  const toggleColumn = (colIndex) => {
    setSelectedColumns((prev) => (
      prev.includes(colIndex) ? prev.filter((idx) => idx !== colIndex) : [...prev, colIndex]
    ))
  }
  const highlightStyle = useMemo(
    () => ({ backgroundColor: alpha(theme.palette.primary.main, 0.14) }),
    [theme.palette.primary.main]
  )
  const tableInputs = useMemo(() => [[rowInputs]], [rowInputs])
  const tables = useMemo(
    () => [{
      tokens,
      headerTokens: tokens.map((token) => displayIndexedSymbolsForNotation(token, notation)),
      rows: [rowInputs],
    }],
    [notation, rowInputs, tokens]
  )
  const selectedGridColumns = useMemo(
    () => selectedColumns.map((colIndex) => ({ tableIndex: 0, colIndex })),
    [selectedColumns]
  )

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={prompt}
      minHeight="200px"
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
          isDisabled={isDisabled() || isLocked || isAssignmentLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      ) : null}
      editorNode={isInstructorView && proof ? (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" logicSystem={logicSystem} />
      ) : null}
    >
      {statement && (
        <Typography sx={{ fontSize: '1.1rem' }}>
          {displayIndexedSymbolsForNotation(statement, notation)}
        </Typography>
      )}
      <TruthTableGrid
        tables={tables}
        tableInputs={tableInputs}
        combined={false}
        readOnly={readOnly}
        selectedColumns={selectedGridColumns}
        onToggleColumn={(_, colIndex) => toggleColumn(colIndex)}
        withSelectors
        renderCell={({ colIndex, cellValue, isHighlighted, cellSx }) => {
          const isEditable = editableIndices[colIndex]
          const value = cellValue ?? ''
          return (
            <TableCell
              key={`partial-tt-cell-${colIndex}`}
              className="tt-cell"
              align="center"
              sx={isHighlighted ? { ...cellSx, ...highlightStyle } : cellSx}
            >
              {isEditable ? (
                <Select
                  value={value}
                  onChange={(event) => handleCellChange(colIndex, event.target.value)}
                  size="small"
                  displayEmpty
                  disabled={readOnly}
                  sx={{
                    minWidth: 'var(--tt-select-min-width)',
                    fontFamily: 'inherit',
                    fontSize: 'var(--tt-font-size)',
                    '& .MuiSelect-select': {
                      fontFamily: 'inherit',
                      fontSize: 'var(--tt-font-size)',
                    },
                  }}
                >
                  <MenuItem value="" sx={{ fontFamily: 'inherit', fontSize: 'var(--tt-font-size)' }}>
                    <em>?</em>
                  </MenuItem>
                  <MenuItem value="T" sx={{ fontFamily: 'inherit', fontSize: 'var(--tt-font-size)' }}>T</MenuItem>
                  <MenuItem value="F" sx={{ fontFamily: 'inherit', fontSize: 'var(--tt-font-size)' }}>F</MenuItem>
                  <MenuItem value="U" sx={{ fontFamily: 'inherit', fontSize: 'var(--tt-font-size)' }}>U</MenuItem>
                </Select>
              ) : (
                <Typography sx={{ fontWeight: 700, fontFamily: 'inherit', fontSize: 'var(--tt-font-size)' }}>
                  {value || toSymbol(givenRow[colIndex])}
                </Typography>
              )}
            </TableCell>
          )
        }}
      />
    </ProblemFrame>
  )
}
