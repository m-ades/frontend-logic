import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Box, Stack, Typography, FormControl, Select, MenuItem, Tooltip, alpha } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import { useTheme } from '@mui/material/styles'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { libtf } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import PromptText from '../../ui/PromptText.jsx'
import { rowsEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'

function TruthToggle({ value, onChange, ariaLabel, accent, readOnly = false }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  
  const cycleValue = (current) => {
    if (!current) return 'T'
    if (current === 'T') return 'F'
    return ''
  }

  const handleClick = () => {
    if (readOnly) return
    onChange(cycleValue(value))
  }

  const primary = theme.palette.primary.main
  const getColor = () => {
    if (value === 'T') return primary
    if (value === 'F') return '#b22'
    if (accent) return primary
    return isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)'
  }

  return (
    <Box
      className="tt-toggle"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (readOnly) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onChange(cycleValue(value))
        }
      }}
      sx={{
        fontWeight: 700,
        color: getColor(),
        cursor: 'pointer',
        textTransform: 'uppercase',
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        transition: 'color 0.15s ease',
        '&:hover': {
          color: primary,
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(primary, 0.6)}`,
          outlineOffset: 2,
        },
      }}
    >
      {value || '-'}
    </Box>
  )
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
}) {
  const theme = useTheme()
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const syntax = useMemo(() => getSyntax(), [])
  const Formula = useMemo(() => getFormulaClass(), [])
  const statement = problem?.statement || problem?.prompt || ''
  const prompt = problem?.prompt && problem?.prompt !== statement ? problem.prompt : ''
  const interpretation = problem?.interpretation || {}
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
    if (!statement) return []
    let rstr = '[(\\[{]*'
    rstr += `[${syntax.notation.predicatesRange}`
    for (const o in syntax.operators) { rstr += o }
    rstr += `][${syntax.notation.constantsRange}${syntax.notation.variableRange}]*`
    rstr += '[)\\]}]*'
    const regex = new RegExp(rstr, 'g')
    return Array.from(statement.replace(/\s/g, '').matchAll(regex)).map(
      (match) => match[0]
    )
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
  const onStateChangeTimerRef = useRef(null)
  const compoundOptions = [
    { value: 'T', label: 'True' },
    { value: 'F', label: 'False' },
  ]

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

  const isDisabled = () =>
    rowInputs.length === 0 ||
    rowInputs.some((cell, idx) => cell === '' && !isAtomicToken(tokens[idx])) ||
    compoundInput === ''

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
      onStateChange?.({ row: resetRow, compound: '' })
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
    scheduleStateChange({ row: next, compound: toBoolean(compoundInput) })
  }

  const handleCompoundChange = (value) => {
    if (readOnly || isLocked) return
    const nextValue = value || ''
    setCompoundInput(nextValue)
    scheduleStateChange({ row: rowInputs, compound: toBoolean(nextValue) })
    setStatus('unanswered')
    setMessage('')
  }

  const toggleColumn = (colIndex) => {
    setSelectedColumns((prev) => (
      prev.includes(colIndex) ? prev.filter((idx) => idx !== colIndex) : [...prev, colIndex]
    ))
  }
  const highlightStyle = useMemo(
    () => ({ backgroundColor: alpha(theme.palette.primary.main, 0.22) }),
    [theme.palette.primary.main]
  )

  const formatInterpretation = () => {
    const entries = Object.entries(interpretation)
    if (!entries.length) return ''
    return entries
      .map(([key, value]) => `${key} = ${value ? 'T' : 'F'}`)
      .join(', ')
  }

  const renderTableSet = (rowsToRender, rowInputsToRender, readOnlyTable) => (
    <Box className="tt-table-wrap">
      <Box component="table" className="tt-table">
        <Box component="thead" className="tt-head">
          <Box component="tr" className="tt-token-row">
            {(headerTokens.length > 0 ? headerTokens : tokens).map((token, idx) => (
              <Box component="th" key={`single-row-header-${idx}`} className="tt-token">
                {token}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rowsToRender.map((row, rowIndex) => (
            <Box component="tr" key={`single-row-${rowIndex}`} className="tt-row">
              {row.map((_, colIndex) => (
                <Box
                  component="td"
                  key={`single-row-cell-${rowIndex}-${colIndex}`}
                  className="tt-cell"
                  sx={selectedColumns.includes(colIndex) ? highlightStyle : undefined}
                >
                  <TruthToggle
                    value={rowInputsToRender[rowIndex]?.[colIndex]}
                    onChange={(value) => handleCellChange(colIndex, value)}
                    ariaLabel={`Answer row ${rowIndex + 1} col ${colIndex + 1}`}
                    accent={false}
                    readOnly={
                      readOnlyTable ||
                      readOnly ||
                      isLocked ||
                      isAtomicToken(tokens[colIndex])
                    }
                  />
                </Box>
              ))}
            </Box>
          ))}
          <Box component="tr" className="tt-selector-row">
            {(headerTokens.length > 0 ? headerTokens : tokens).map((_, colIndex) => (
              <Box
                component="td"
                key={`single-row-colsel-${colIndex}`}
                sx={{ width: 20, minWidth: 20, p: 0.25 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <ColumnRowSelectorBox
                    selected={selectedColumns.includes(colIndex)}
                    onClick={() => toggleColumn(colIndex)}
                    ariaLabel={`Select column ${colIndex + 1}`}
                    theme={theme}
                    tooltip="highlight column"
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )

  const renderAnswerBlock = (title, body) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
        {title}
      </Typography>
      <Box sx={{ mt: 2 }}>
        {body}
      </Box>
    </Box>
  )

  if (!statement) {
    return <Typography color="error">Invalid problem</Typography>
  }

  const tableRows = [rowInputs]
  const tableFilled = rowInputs.length > 0 && !isDisabled()
  const isCurrentlyCorrect = tableFilled &&
    rowInputs.length === expectedRow.length &&
    rowInputs.every((cell, idx) => cell === expectedRow[idx]) &&
    compoundInput === expectedCompound

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            overflow: 'visible',
            minHeight: '260px',
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
            {renderTableSet(tableRows, tableRows, false)}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Truth value of compound statement:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 'var(--tt-select-min-width)' }}>
                <Select
                  value={compoundInput}
                  displayEmpty
                  onChange={(event) => handleCompoundChange(event.target.value)}
                  inputProps={{ 'aria-label': 'Truth value of compound statement' }}
                  disabled={readOnly || isLocked}
                  sx={{
                    borderRadius: 0,
                    '& .MuiOutlinedInput-notchedOutline': { borderRadius: 0 },
                  }}
                >
                  <MenuItem value="">
                    <em>Select</em>
                  </MenuItem>
                  {compoundOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {isLocked && status !== 'correct' && expectedRow.length > 0 && (
              /* show answer in card */
              renderAnswerBlock(
                'Correct Answer',
                <Stack spacing={2}>
                  {renderTableSet([expectedRow], [expectedRow], true)}
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Truth value of compound statement:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 'var(--tt-select-min-width)' }}>
                      <Select
                        value={expectedCompound}
                        displayEmpty
                        inputProps={{ 'aria-label': 'Truth value (answer)' }}
                        disabled
                        sx={{
                          borderRadius: 0,
                          '& .MuiOutlinedInput-notchedOutline': { borderRadius: 0 },
                        }}
                      >
                        <MenuItem value="">
                          <em>Select</em>
                        </MenuItem>
                        {compoundOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              )
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
                  : 'Click cells to toggle truth values - fill in every cell to finish.'}
            </Typography>
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
          isDisabled={!tableFilled || isLocked || isAssignmentLocked}
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
