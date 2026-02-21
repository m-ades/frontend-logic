import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Tooltip,
  alpha,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import { useTheme } from '@mui/material/styles'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import { getTokenSpeechLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import PromptText from '../../ui/PromptText.jsx'
import { rowsEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'

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

function ColumnRowSelectorBox({ selected, onClick, ariaLabel, theme, tooltip }) {
  const primary = theme.palette.primary.main
  const borderColor = theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.3)' 
    : 'rgba(0, 0, 0, 0.4)'
  return (
    <Tooltip title={tooltip || ''}>
      <Box
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        }}
        sx={{
          width: 14,
          height: 14,
          minWidth: 14,
          minHeight: 14,
          border: `2px solid ${borderColor}`,
          borderRadius: 0.5,
          bgcolor: selected ? alpha(primary, 0.4) : 'transparent',
          outline: selected ? `2px solid ${primary}` : 'none',
          outlineOffset: -1,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: selected ? alpha(primary, 0.5) : alpha(primary, 0.12),
            borderColor: selected ? primary : borderColor,
          },
          '&:focus-visible': {
            outline: `2px solid ${alpha(primary, 0.6)}`,
            outlineOffset: 1,
          },
        }}
      />
    </Tooltip>
  )
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
}) {
  const theme = useTheme()
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const Formula = useMemo(() => getFormulaClass(), [])
  const statement = problem?.statement || problem?.formula || ''
  const prompt = problem?.prompt || ''
  const givenRow = Array.isArray(problem?.row) ? problem.row : []
  const savedRow = savedState?.row ?? []

  const tokens = useMemo(() => {
    if (!statement) return []
    const wff = Formula.from(statement)
    const tables = multiTables([wff])
    return tables?.tables?.[0]?.tokens ?? []
  }, [Formula, statement])

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
    [givenRow, savedRow, tokens]
  )

  const [rowInputs, setRowInputs] = useState(() => initialRow)
  const [selectedColumns, setSelectedColumns] = useState([])
  const onStateChangeTimerRef = useRef(null)

  useEffect(() => () => clearDebounce(onStateChangeTimerRef), [])

  useEffect(() => {
    setRowInputs((prev) => (rowsEqual(prev, initialRow) ? prev : initialRow))
  }, [initialRow])

  const isDisabled = () =>
    rowInputs.length === 0 ||
    rowInputs.some((cell, idx) => editableIndices[idx] && cell === '')

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

  return (
    <Stack spacing={2} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            overflow: 'visible',
            minHeight: '200px',
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
            {prompt && (
              <PromptText content={prompt} />
            )}
            {statement && (
              <Typography sx={{ fontSize: '1.1rem' }}>
                {statement}
              </Typography>
            )}
            <TableContainer 
              component={Paper} 
              className="tt-table-wrap" 
              elevation={0} 
              sx={{ 
                background: 'transparent', 
                boxShadow: 'none !important',
                '&.MuiPaper-root': {
                  boxShadow: 'none !important',
                },
                '& .MuiTable-root': {
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  fontSize: 'var(--tt-font-size)',
                  fontFamily: 'inherit',
                },
                '& .MuiTableCell-root': {
                  color: 'text.primary',
                  borderColor: 'divider',
                  fontFamily: 'inherit',
                  fontSize: 'var(--tt-token-font-size)',
                },
                '& .MuiTableBody .MuiTableCell-root': {
                  fontSize: 'var(--tt-font-size)',
                },
                '& .MuiTableHead-root .MuiTableCell-root': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : undefined,
                  fontFamily: 'inherit',
                  fontSize: 'var(--tt-token-font-size)',
                  fontWeight: 600,
                },
                '& .tt-row-selector-cell': {
                  border: 'none !important',
                  borderBottom: 'none !important',
                  backgroundColor: 'transparent !important',
                },
                '& .tt-selector-row .MuiTableCell-root': {
                  border: 'none !important',
                  borderBottom: 'none !important',
                  backgroundColor: 'transparent !important',
                },
                '& .tt-selector-corner, & .tt-selector-corner-bottom': {
                  border: 'none !important',
                  borderBottom: 'none !important',
                },
              }}
            >
              <Table className="tt-table">
                <TableHead className="tt-head">
                  <TableRow className="tt-token-row">
                    {tokens.map((token, idx) => (
                      <TableCell 
                        key={`partial-tt-token-${idx}`} 
                        className="tt-token" 
                        align="center"
                        aria-label={getTokenSpeechLabel(token)}
                        sx={{ fontFamily: 'inherit', fontSize: 'var(--tt-token-font-size)', fontWeight: 600 }}
                      >
                        <span aria-hidden="true">{token}</span>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow className="tt-row">
                    {tokens.map((_, idx) => {
                      const isEditable = editableIndices[idx]
                      const value = rowInputs[idx] ?? ''
                      const colMatch = selectedColumns.includes(idx)
                      return (
                        <TableCell
                          key={`partial-tt-cell-${idx}`}
                          className="tt-cell"
                          align="center"
                          sx={colMatch ? highlightStyle : undefined}
                        >
                          {isEditable ? (
                            <Select
                              value={value}
                              onChange={(event) => handleCellChange(idx, event.target.value)}
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
                            <Typography sx={{ fontWeight: 700, fontFamily: 'inherit', fontSize: 'var(--tt-font-size)' }}>{value || toSymbol(givenRow[idx])}</Typography>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                  <TableRow className="tt-selector-row">
                    {tokens.map((_, idx) => (
                      <TableCell key={`partial-tt-colsel-${idx}`} align="center" sx={{ width: 20, minWidth: 20, p: 0.25 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <ColumnRowSelectorBox
                            selected={selectedColumns.includes(idx)}
                            onClick={() => toggleColumn(idx)}
                            ariaLabel={`Select column ${idx + 1}`}
                            theme={theme}
                            tooltip="highlight column"
                          />
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
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
          isDisabled={isDisabled() || isLocked || isAssignmentLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      )}
      {isInstructorView && proof && (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" />
      )}
    </Stack>
  )
}
