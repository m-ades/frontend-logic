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
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import { useTheme } from '@mui/material/styles'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import PromptText from '../../ui/PromptText.jsx'

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
}) {
  const theme = useTheme()
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const Formula = useMemo(() => getFormulaClass(), [])
  const statement = problem?.statement || problem?.formula || ''
  const prompt = problem?.prompt || ''
  const givenRow = Array.isArray(problem?.row) ? problem.row : []

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

  const buildInitialRow = () =>
    tokens.map((_, idx) => {
      const given = toTruth(givenRow[idx])
      if (given !== null) {
        return toSymbol(givenRow[idx])
      }
      const saved = savedState?.row?.[idx]
      return saved ? toSymbol(saved) : ''
    })

  const [rowInputs, setRowInputs] = useState(buildInitialRow)

  useEffect(() => {
    setRowInputs(buildInitialRow())
  }, [savedState, tokens, statement, givenRow])

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
      const reset = buildInitialRow()
      setRowInputs(reset)
      onStateChange?.({ row: reset })
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
      onStateChange?.({ row: next })
      return next
    })
    setStatus('unanswered')
    setMessage('')
  }

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
                        sx={{ fontFamily: 'inherit', fontSize: 'var(--tt-token-font-size)', fontWeight: 600 }}
                      >
                        {token}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow className="tt-row">
                    {tokens.map((_, idx) => {
                      const isEditable = editableIndices[idx]
                      const value = rowInputs[idx] ?? ''
                      return (
                        <TableCell key={`partial-tt-cell-${idx}`} className="tt-cell" align="center">
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
