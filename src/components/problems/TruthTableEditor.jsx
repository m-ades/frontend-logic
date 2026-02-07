import * as React from 'react'
import {
  Box,
  Stack,
  Typography,
  FormControl,
  FormGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import StatusBanner, { isTerminalStatus } from '../ui/StatusBanner.jsx'
import { getSubmissionScore } from '../../utils/problemHelpers.js'
import getFormulaClass from '../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../lib/logicpenguin/symbolic/libsyntax.js'
import {
  multiTables,
  formulaTable,
  equivTables,
  argumentTables,
} from '../../lib/logicpenguin/symbolic/libsemantics.js'
import { fullTableMatch } from '../../lib/logicpenguin/checkers/truth-tables.js'
import ProblemSetButtons from './mui/ProblemSetButtons.jsx'
import InstructorQuestionEditor from './InstructorQuestionEditor.jsx'
import { fetchJson, getActiveUserId } from '../../utils/api.js'
import PromptText from '../ui/PromptText.jsx'

const tablesEqual = (left = [], right = []) => {
  if (left === right) return true
  if (left.length !== right.length) return false
  for (let t = 0; t < left.length; t += 1) {
    const leftRows = left[t] || []
    const rightRows = right[t] || []
    if (leftRows.length !== rightRows.length) return false
    for (let r = 0; r < leftRows.length; r += 1) {
      const leftRow = leftRows[r] || []
      const rightRow = rightRows[r] || []
      if (leftRow.length !== rightRow.length) return false
      for (let c = 0; c < leftRow.length; c += 1) {
        if (leftRow[c] !== rightRow[c]) return false
      }
    }
  }
  return true
}

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
    // Empty/placeholder color - needs to be visible in both modes
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

function ColumnRowSelectorBox({ selected, onClick, ariaLabel, theme }) {
  const primary = theme.palette.primary.main
  const borderColor = theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.3)' 
    : 'rgba(0, 0, 0, 0.4)'
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
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
  )
}

export default function TruthTableEditor({
  proof,
  savedState,
  onStateChange,
  onProofComplete,
  hideActions = false,
  suppressReveal = false,
  embedded = false,
  solutionOnly = false,
  parentStatus,
  parentAttemptCount,
  parentAttemptLimit,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
}) {
  const editorRef = React.useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const truthTable = proof.truthTable ?? {}
  const syntax = React.useMemo(() => getSyntax(), [])
  const Formula = React.useMemo(() => getFormulaClass(), [])
  const kind = truthTable.kind
    ?? (truthTable.left && truthTable.right ? 'equivalence' : 'formula')
  const classificationEnabled = React.useMemo(() => {
    return Boolean(
      truthTable?.options?.question ??
      proof?.options?.question ??
      false
    )
  }, [proof?.options?.question, truthTable?.options?.question])
  const classificationOptions = React.useMemo(() => {
    if (!classificationEnabled) { return []; }
    if (kind === 'formula') {
      return [
        { value: 'tautology', label: 'Tautology' },
        { value: 'contingent', label: 'Contingent' },
        { value: 'self-contradiction', label: 'Self-contradiction' },
      ];
    }
    if (kind === 'equivalence') {
      return [
        { value: 'equivalent', label: 'Logically equivalent' },
        { value: 'contradictory', label: 'Contradictory' },
        { value: 'consistent', label: 'Consistent' },
        { value: 'inconsistent', label: 'Inconsistent' },
      ];
    }
    if (kind === 'argument') {
      return [
        { value: 'valid', label: 'Valid' },
        { value: 'invalid', label: 'Invalid' },
      ];
    }
    return [];
  }, [classificationEnabled, kind])
  const operatorSet = React.useMemo(() => new Set(Object.keys(syntax.operators)), [syntax])
  const statements = React.useMemo(() => {
    if (Array.isArray(truthTable.statements) && truthTable.statements.length > 0) {
      return truthTable.statements
    }
    if (Array.isArray(truthTable.formulas) && truthTable.formulas.length > 0) {
      return truthTable.formulas
    }
    if (kind === 'argument' && truthTable.lefts && truthTable.right) {
      return [...truthTable.lefts, truthTable.right]
    }
    if (kind === 'equivalence' && truthTable.left && truthTable.right) {
      return [truthTable.left, truthTable.right]
    }
    if (truthTable.statement || truthTable.formula) {
      return [truthTable.statement ?? truthTable.formula]
    }
    return []
  }, [kind, truthTable])

  const tables = React.useMemo(() => {
    if (statements.length === 0) return []
    const wffs = statements.map((statement) => Formula.from(statement))
    const res = multiTables(wffs)
    return statements.map((label, idx) => {
      const statement = statements[idx]
      const tokenizeForHeader = (stmt) => {
        if (!stmt) return []
        let rstr = '[(\\[{]*'
        rstr += `[${syntax.notation.predicatesRange}`
        for (const o in syntax.operators) { rstr += o }
        rstr += `][${syntax.notation.constantsRange}${syntax.notation.variableRange}]*`
        rstr += '[)\\]}]*'
        const regex = new RegExp(rstr, 'g')
        return Array.from(stmt.replace(/\s/g, '').matchAll(regex)).map(
          (match) => match[0]
        )
      }
      return {
        label,
        tokens: res.tables[idx]?.tokens ?? [],
        rows: res.tables[idx]?.rows ?? [],
        headerTokens: tokenizeForHeader(statement),
      }
    })
  }, [Formula, statements, syntax])

  const isAtomicToken = React.useCallback(
    (token) => {
      if (!token) return false
      const stripped = token.replace(/[()\\[\\]{}]/g, '')
      if (stripped.length !== 1) return false
      return !operatorSet.has(stripped)
    },
    [operatorSet]
  )

  const expectedTables = React.useMemo(
    () =>
      tables.map((table) =>
        table.rows.map((row) => row.map((cell) => (cell ? 'T' : 'F')))
      ),
    [tables]
  )

  const derivedInitialTables = React.useMemo(
    () =>
      tables.map((table, tableIndex) =>
        table.rows.map((row, rowIndex) =>
          row.map((_, colIndex) =>
            savedState?.tables?.[tableIndex]?.rows?.[rowIndex]?.[colIndex] ??
            (isAtomicToken(table.tokens[colIndex])
              ? expectedTables?.[tableIndex]?.[rowIndex]?.[colIndex]
              : '')
          )
        )
      ),
    [expectedTables, isAtomicToken, savedState, tables]
  )
  const resetTables = React.useMemo(
    () =>
      tables.map((table, tableIndex) =>
        table.rows.map((row, rowIndex) =>
          row.map((_, colIndex) =>
            isAtomicToken(table.tokens[colIndex])
              ? expectedTables?.[tableIndex]?.[rowIndex]?.[colIndex]
              : ''
          )
        )
      ),
    [expectedTables, isAtomicToken, tables]
  )

  const [tableInputs, setTableInputs] = React.useState(derivedInitialTables)
  const [status, setStatus] = React.useState('unanswered')
  const [message, setMessage] = React.useState('')
  const [isChecking, setIsChecking] = React.useState(false)
  const [attemptCount, setAttemptCount] = React.useState(savedState?.attemptCount ?? 0)
  const [attemptLimit, setAttemptLimit] = React.useState(proof?.attemptLimit ?? 3)
  const assignmentQuestionId = Number(proof?.questionId || 0)
  const [mcSelection, setMcSelection] = React.useState([])
  const [selectedColumns, setSelectedColumns] = React.useState([]) // [{ tableIndex, colIndex }, ...]
  const [selectedRows, setSelectedRows] = React.useState([]) // [rowIndex, ...]
  const toggleColumn = (tableIndex, colIndex) => {
    setSelectedColumns((prev) => {
      const has = prev.some((c) => c.tableIndex === tableIndex && c.colIndex === colIndex)
      return has
        ? prev.filter((c) => !(c.tableIndex === tableIndex && c.colIndex === colIndex))
        : [...prev, { tableIndex, colIndex }]
    })
  }
  const toggleRow = (rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((r) => r !== rowIndex) : [...prev, rowIndex]
    )
  }
  const lastRestoredProofIdRef = React.useRef(undefined)
  const onStateChangeTimerRef = React.useRef(null)
  React.useEffect(() => {
    setAttemptLimit(proof?.attemptLimit ?? 3)
  }, [proof?.attemptLimit])
  React.useEffect(() => () => {
    if (onStateChangeTimerRef.current) {
      clearTimeout(onStateChangeTimerRef.current)
      onStateChangeTimerRef.current = null
    }
  }, [])
  const scheduleStateChange = React.useCallback((nextState) => {
    if (!onStateChange) return
    if (onStateChangeTimerRef.current) {
      clearTimeout(onStateChangeTimerRef.current)
    }
    onStateChangeTimerRef.current = setTimeout(() => {
      onStateChangeTimerRef.current = null
      onStateChange(nextState)
    }, 150)
  }, [onStateChange])
  const updateClassificationSelection = React.useCallback((next) => {
    setMcSelection(next)
    onStateChange?.({
      tables: tableInputs.map((rows) => ({ rows })),
      mcans: next,
      taut: next.includes('tautology'),
      contra: next.includes('self-contradiction'),
      valid: next.includes('valid'),
      equiv: next.includes('equivalent'),
      classification: {
        mcans: next,
        taut: next.includes('tautology'),
        contra: next.includes('self-contradiction'),
      },
    })
    if (status !== 'unanswered') {
      setStatus('unanswered')
      setMessage('')
    }
  }, [onStateChange, status, tableInputs])

  React.useEffect(() => {
    if (proof?.id === lastRestoredProofIdRef.current) return
    lastRestoredProofIdRef.current = proof?.id
    const normalizeSavedSelection = () => {
      if (Array.isArray(savedState?.mcans)) {
        return savedState.mcans.map((v) => String(v));
      }
      if (kind === 'formula') {
        if (savedState?.taut) { return ['tautology']; }
        if (savedState?.contra) { return ['self-contradiction']; }
        if (savedState?.mcans === 1) { return ['contingent']; }
      }
      if (kind === 'argument') {
        if (savedState?.valid === true || savedState?.mcans === 0) { return ['valid']; }
        if (savedState?.valid === false || savedState?.mcans === 1) { return ['invalid']; }
      }
      if (kind === 'equivalence') {
        if (savedState?.equiv === true || savedState?.mcans === 0) { return ['equivalent']; }
      }
      return [];
    }
    setTableInputs((prev) => (tablesEqual(prev, derivedInitialTables) ? prev : derivedInitialTables))
    setMcSelection(normalizeSavedSelection())
  }, [derivedInitialTables, kind, proof?.id, savedState])

  const handleCellChange = (tableIndex, rowIndex, colIndex, value) => {
    const nextTables = tableInputs.map((tableRows, tIdx) =>
      tIdx === tableIndex
        ? tableRows.map((row, rIdx) =>
            rIdx === rowIndex
              ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
              : row
          )
        : tableRows
    )
    setTableInputs(nextTables)
    scheduleStateChange({
      tables: nextTables.map((rows) => ({ rows })),
      ...(classificationEnabled ? {
        mcans: mcSelection,
        taut: mcSelection.includes('tautology'),
        contra: mcSelection.includes('self-contradiction'),
        valid: mcSelection.includes('valid'),
        equiv: mcSelection.includes('equivalent'),
        classification: {
          mcans: mcSelection,
          taut: mcSelection.includes('tautology'),
          contra: mcSelection.includes('self-contradiction'),
        },
      } : {}),
    })
    if (status !== 'unanswered') {
      setStatus('unanswered')
      setMessage('')
    }
  }

  const parsedInputTables = React.useMemo(
    () =>
      tableInputs.map((table) =>
        table.map((row) =>
          row.map((cell) => {
            if (cell === 'T') return true
            if (cell === 'F') return false
            return -1
          })
        )
      ),
    [tableInputs]
  )

  const tableChecks = React.useMemo(
    () =>
      tables.map((table, tIdx) =>
        fullTableMatch(table.rows, parsedInputTables[tIdx] ?? [])
      ),
    [parsedInputTables, tables]
  )

  const tableMatches = React.useMemo(() => {
    return tables.map((table, tIdx) =>
      table.rows.map((expectedRow, rIdx) => {
        const givenRow = parsedInputTables[tIdx]?.[rIdx]
        if (!givenRow || givenRow.length !== expectedRow.length) return false
        return expectedRow.every(
          (expected, cIdx) => givenRow[cIdx] === expected
        )
      })
    )
  }, [parsedInputTables, tables])

  const useCombinedTable = tables.length > 1
  const combinedRowMatches = React.useMemo(() => {
    if (!useCombinedTable || tables.length === 0) return []
    const rowCount = tables[0]?.rows?.length ?? 0
    return Array.from({ length: rowCount }, (_, rowIndex) =>
      tables.every((_, tIdx) => tableMatches[tIdx]?.[rowIndex])
    )
  }, [tableMatches, tables, useCombinedTable])

  const hasTruthTable = tables.length > 0 && expectedTables.length === tables.length
  const tableFilledOnly =
    hasTruthTable &&
    tableInputs.length > 0 &&
    tableInputs.every((t, tIdx) =>
      t.length === (tables[tIdx]?.rows?.length ?? 0) &&
      t.every(
        (row, rIdx) =>
          row.length === (tables[tIdx]?.rows?.[rIdx]?.length ?? 0) &&
          row.every((cell) => cell !== '')
      )
    )
  const tableFilled =
    tableFilledOnly && (!classificationEnabled || mcSelection.length > 0)

  const tableCorrect =
    hasTruthTable &&
    tableChecks.length > 0 &&
    tableChecks.every((res) => res.rowdiff === 0 && res.offcells.length === 0)

  if (!hasTruthTable) {
    return (
      <Stack spacing={2} sx={{ px: 0, width: '100%' }}>
        <Typography color="text.secondary">
          No truth-table metadata is available for this problem.
        </Typography>
      </Stack>
    )
  }

  const buildSubmissionData = () => {
    const toBool = (cell) => cell === 'T'
    const mapRows = (rows) => rows.map((row) => row.map(toBool))
    const tableData = tableInputs.map((rows) => ({
      rows: mapRows(rows),
      colhls: rows.length > 0 ? Array(rows[0].length).fill(false) : [],
    }))

    const base = { lefts: [], right: { rows: [] }, rowhls: [] }

    if (tableData.length === 0) {
      return base
    }

    if (kind === 'formula') {
      const payload = { lefts: [], right: tableData[0], rowhls: [] }
      if (classificationEnabled) {
        payload.mcans = mcSelection
        payload.taut = mcSelection.includes('tautology')
        payload.contra = mcSelection.includes('self-contradiction')
      }
      return payload
    }

    if (kind === 'equivalence' && classificationEnabled) {
      const payload = { lefts: [tableData[0]], right: tableData[1], rowhls: [] }
      payload.mcans = mcSelection
      payload.equiv = mcSelection.includes('equivalent')
      return payload
    }

    if (kind === 'equivalence') {
      return { lefts: [tableData[0]], right: tableData[1], rowhls: [] }
    }

    // argument (premises + conclusion)
    if (tableData.length > 1) {
      return {
        lefts: tableData.slice(0, -1),
        right: tableData[tableData.length - 1],
        rowhls: [],
        ...(classificationEnabled
          ? {
              mcans: mcSelection,
              valid: mcSelection.includes('valid'),
            }
          : {}),
      }
    }

    return { lefts: [], right: tableData[0], rowhls: [] }
  }

  const handleCheck = async () => {
    if (isChecking || attemptCount >= attemptLimit) return
    if (!tableFilled) {
      setStatus('unanswered')
      setMessage(classificationEnabled && mcSelection.length === 0
        ? 'Select a classification before submitting.'
        : 'Complete the table before submitting.'
      )
      return
    }
    setIsChecking(true)
    try {
      if (assignmentQuestionId) {
        const resp = await fetchJson('/api/validate/submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_question_id: assignmentQuestionId,
            user_id: getActiveUserId(),
            submission_data: buildSubmissionData(),
          }),
        })
        const validation = resp?.validation || {}
        const success = validation.successstatus === 'correct'
        // sync limit from server response
        if (typeof resp?.attempt_limit === 'number') {
          setAttemptLimit(resp.attempt_limit)
        }
        setAttemptCount((prev) => resp?.submission?.attempt ?? Math.min(prev + 1, attemptLimit))
        const score = getSubmissionScore(resp)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('assignment-submission', {
            detail: {
              assignmentQuestionId,
              attempt: resp?.submission?.attempt,
              attemptLimit: resp?.attempt_limit,
              isCorrect: success,
              score,
            },
          }))
        }
        if (success) {
          setStatus('correct')
          setMessage('Correct!')
          onProofComplete?.(proof.id)
        } else if (score != null && score > 0 && score < 100) {
          setStatus('partial')
          setMessage(validation.message || validation.transmessage || 'Partially correct.')
        } else {
          setStatus('incorrect')
          setMessage(validation.message || validation.transmessage || 'Incorrect.')
        }
      } else {
        setAttemptCount((prev) => Math.min(prev + 1, attemptLimit))
        if (tableCorrect && (!classificationEnabled || mcSelection.length > 0)) {
          setStatus('correct')
          setMessage('Correct!')
          onProofComplete?.(proof.id)
        } else {
          setStatus('incorrect')
          setMessage(classificationEnabled && mcSelection.length === 0
            ? 'Select a classification before submitting.'
            : 'Incorrect.'
          )
        }
      }
    } catch (err) {
      setStatus('malfunction')
      setMessage('Error submitting answer')
    } finally {
      setIsChecking(false)
    }
  }

  const handleStartOver = () => {
    if (attemptCount >= attemptLimit) return
    setTableInputs(resetTables)
    onStateChange?.({
      tables: resetTables.map((rows) => ({ rows })),
      mcans: [],
      taut: false,
      contra: false,
      valid: false,
      equiv: false,
      classification: { mcans: [], taut: false, contra: false },
    })
    setMcSelection([])
    setStatus('unanswered')
    setMessage('')
  }

  const solutionTables = React.useMemo(() => {
    const solution = proof?.solution
    if (!solution) return []
    if (solution.format === 'truth-table' && Array.isArray(solution.rows)) {
      return [{
        label: solution.label || proof?.description || 'Answer',
        tokens: solution.tokens || [],
        rows: solution.rows
      }]
    }
    if (solution.format === 'truth-table-row' && Array.isArray(solution.row)) {
      return [{
        label: solution.label || proof?.description || 'Answer',
        tokens: solution.tokens || [],
        rows: [solution.row]
      }]
    }
    if (Array.isArray(solution.tables)) {
      return solution.tables.map((table) => ({
        label: table.label || '',
        tokens: table.tokens || [],
        rows: table.rows || []
      }))
    }
    return []
  }, [proof])
  const solutionTablesFromProblem = React.useMemo(
    () =>
      tables.map((table) => ({
        label: table.label || '',
        tokens: table.tokens || [],
        rows: (table.rows || []).map((row) =>
          row.map((cell) => (cell === true || cell === 'T' ? 'T' : 'F'))
        ),
        headerTokens: table.headerTokens,
      })),
    [tables]
  )
  const displaySolutionTables =
    solutionTables.length > 0
      ? solutionTables
      : solutionTablesFromProblem
  const effectiveStatus = embedded && parentStatus != null ? parentStatus : status
  const effectiveAttemptCount = embedded && parentAttemptCount != null ? parentAttemptCount : attemptCount
  const effectiveAttemptLimit = embedded && parentAttemptLimit != null ? parentAttemptLimit : attemptLimit
  const showSolution =
    effectiveAttemptCount >= effectiveAttemptLimit && effectiveStatus !== 'correct' && displaySolutionTables.length > 0

  // Correct multiple-choice answer for solution reveal (from proof.solution or derived from problem)
  const solutionMcValues = React.useMemo(() => {
    const solution = proof?.solution
    if (kind === 'formula') {
      if (solution?.taut) return ['tautology']
      if (solution?.contra) return ['self-contradiction']
      if (solution?.mcans === 1) return ['contingent']
      if (statements.length === 0) return []
      try {
        const wff = Formula.from(statements[0])
        const { taut, contra } = formulaTable(wff)
        if (taut) return ['tautology']
        if (contra) return ['self-contradiction']
        return ['contingent']
      } catch {
        return []
      }
    }
    if (kind === 'argument') {
      if (solution?.valid === true) return ['valid']
      if (solution?.valid === false) return ['invalid']
      if (statements.length < 2) return []
      try {
        const leftWffs = statements.slice(0, -1).map((s) => Formula.from(s))
        const rightWff = Formula.from(statements[statements.length - 1])
        const { valid } = argumentTables(leftWffs, rightWff)
        return valid ? ['valid'] : ['invalid']
      } catch {
        return []
      }
    }
    if (kind === 'equivalence') {
      if (solution?.equiv === true) return ['equivalent']
      if (solution?.equiv === false) {
        // determine relation type contradictory consistent or inconsistent
        if (statements.length < 2) return []
        try {
          const fa = Formula.from(statements[0])
          const fb = Formula.from(statements[1])
          const { A, B } = equivTables(fa, fb)
          const toBool = (v) => v === true || v === 'T'
          let equiv = true
          let contra = true
          let consistent = false
          let comp = true
          for (let i = 0; i < A.rows.length; i++) {
            const tvA = toBool(A.rows[i][A.opspot])
            const tvB = toBool(B.rows[i][B.opspot])
            if (tvA !== tvB) equiv = false
            else contra = false
            if (tvA && tvB) consistent = true
          }
          const inconsistent = comp && !consistent
          const labels = []
          if (equiv) labels.push('equivalent')
          if (contra) labels.push('contradictory')
          if (consistent) labels.push('consistent')
          if (inconsistent) labels.push('inconsistent')
          return labels
        } catch {
          return []
        }
      }
      if (statements.length < 2) return []
      try {
        const fa = Formula.from(statements[0])
        const fb = Formula.from(statements[1])
        const { equiv, A, B } = equivTables(fa, fb)
        if (equiv) return ['equivalent']
        const toBool = (v) => v === true || v === 'T'
        let contra = true
        let consistent = false
        for (let i = 0; i < A.rows.length; i++) {
          const tvA = toBool(A.rows[i][A.opspot])
          const tvB = toBool(B.rows[i][B.opspot])
          if (tvA !== tvB) contra = false
          if (tvA && tvB) consistent = true
        }
        const labels = []
        if (contra) labels.push('contradictory')
        if (consistent) labels.push('consistent')
        if (!consistent) labels.push('inconsistent')
        return labels
      } catch {
        return []
      }
    }
    return []
  }, [kind, proof?.solution, statements, Formula])

  const theme = useTheme()
  const cellBorderColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'var(--lpgray6)'
  const cornerBg = theme.palette.mode === 'dark' ? '#23232D' : '#fff'
  const highlightStyle = React.useMemo(
    () => ({ backgroundColor: alpha(theme.palette.primary.main, 0.22) }),
    [theme.palette.primary.main]
  )
  const tableSx = {
    background: 'transparent',
    boxShadow: 'none !important',
    '&.MuiPaper-root': { boxShadow: 'none !important' },
    '& .MuiTable-root': { background: 'transparent', border: 'none', boxShadow: 'none' },
    '& .MuiTableCell-root': { color: 'text.primary', border: `1px solid ${cellBorderColor} !important` },
    '& .MuiTableHead-root .MuiTableCell-root:not(.tt-selector-corner)': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : undefined },
    '& .MuiTableRow-root:nth-of-type(even)': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : undefined },
    '& .tt-row-selector-cell': { border: 'none !important', backgroundColor: 'transparent !important' },
    '& .tt-selector-row .MuiTableCell-root': { border: 'none !important', backgroundColor: 'transparent !important' },
    '& .tt-selector-corner, & .tt-selector-corner-bottom': { border: 'none !important', background: `${cornerBg} !important` },
  }
  const renderSelectorBox = (selected, onClick, ariaLabel) => (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <ColumnRowSelectorBox selected={selected} onClick={onClick} ariaLabel={ariaLabel} theme={theme} />
    </Box>
  )
  const renderTableSet = (tablesToRender, tableInputsToRender, combined, readOnly, onCellChange, showConclusionMarker, withSelectors = true) => {
    if (combined) {
      const rowCount = tablesToRender[0]?.rows?.length || 0
      return (
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
            },
            '& .MuiTableCell-root': {
              color: 'text.primary',
              border: `1px solid ${cellBorderColor} !important`,
              borderColor: `${cellBorderColor} !important`,
            },
            '& .MuiTableHead-root .MuiTableCell-root:not(.tt-selector-corner)': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : undefined,
            },
                '& .MuiTableRow-root:nth-of-type(even)': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : undefined,
            },
            '& .tt-row-selector-cell, & .tt-selector-corner, & .tt-selector-corner-bottom': {
              border: 'none !important',
              borderBottom: 'none !important',
            },
            '& .tt-selector-row .MuiTableCell-root': {
              border: 'none !important',
              borderBottom: 'none !important',
              backgroundColor: 'transparent !important',
            },
            '& .tt-row-selector-cell': {
              backgroundColor: 'transparent !important',
            },
            '& .MuiTableHead-root .MuiTableCell-root.tt-selector-corner, & .tt-selector-corner-bottom': {
              backgroundColor: `${cornerBg} !important`,
            },
          }}
        >
          <Table className="tt-table">
            <TableHead className="tt-head">
              <TableRow className="tt-token-row">
                {tablesToRender.map((table, tableIndex) => {
                  const isConclusion = showConclusionMarker && tableIndex === tablesToRender.length - 1 && tablesToRender.length > 1
                  const isSeparator = tableIndex > 0
                  const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                  return (
                    <React.Fragment key={`solution-tokenfrag-${tableIndex}`}>
                      {isSeparator && (
                        <TableCell 
                          className="tt-token tt-separator" 
                          align="center"
                          sx={{ background: 'transparent', color: 'text.secondary' }}
                        >
                          {isConclusion ? '//' : '/'}
                        </TableCell>
                      )}
                      {headerTokens.map((token, tokenIndex) => (
                        <TableCell
                          key={`solution-header-${tableIndex}-${tokenIndex}`}
                          className={
                            isConclusion && tokenIndex === 0 ? 'tt-token tt-conclusion' : 'tt-token'
                          }
                          align="center"
                        >
                          {token}
                        </TableCell>
                      ))}
                    </React.Fragment>
                  )
                })}
                {withSelectors && <TableCell className="tt-selector-corner" align="center" style={{ background: cornerBg }} sx={{ width: 20, minWidth: 20, p: 0 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: rowCount }, (_, rowIndex) => (
                <TableRow key={`solution-row-${rowIndex}`} className="tt-row">
                  {tablesToRender.map((table, tableIndex) => {
                    const isConclusion = showConclusionMarker && tableIndex === tablesToRender.length - 1 && tablesToRender.length > 1
                    return (
                      <React.Fragment key={`solution-rowfrag-${tableIndex}`}>
                        {tableIndex > 0 && (
                          <TableCell 
                            className="tt-cell tt-separator-cell" 
                            align="center"
                            sx={{ background: 'transparent' }}
                          >
                            {/* separator column intentionally blank */}
                          </TableCell>
                        )}
                        {table.rows[rowIndex].map((_, colIndex) => {
                          const colMatch = selectedColumns.some((c) => c.tableIndex === tableIndex && c.colIndex === colIndex)
                          const rowMatch = selectedRows.includes(rowIndex)
                          return (
                            <TableCell
                              key={`solution-cell-${tableIndex}-${rowIndex}-${colIndex}`}
                              className={
                                isConclusion && colIndex === 0 ? 'tt-cell tt-conclusion-cell' : 'tt-cell'
                              }
                              align="center"
                              sx={withSelectors && (colMatch || rowMatch) ? highlightStyle : undefined}
                            >
                              <TruthToggle
                                value={tableInputsToRender[tableIndex]?.[rowIndex]?.[colIndex]}
                                onChange={(token) => onCellChange?.(tableIndex, rowIndex, colIndex, token)}
                                ariaLabel={`Answer row ${rowIndex + 1} col ${colIndex + 1}`}
                                accent={false}
                                readOnly={readOnly}
                              />
                            </TableCell>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                  {withSelectors && (
                    <TableCell className="tt-row-selector-cell" align="center" sx={{ width: 20, minWidth: 20, p: 0.25, verticalAlign: 'middle' }}>
                      {renderSelectorBox(selectedRows.includes(rowIndex), () => toggleRow(rowIndex), `Select row ${rowIndex + 1}`)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {withSelectors && (
                <TableRow className="tt-selector-row">
                  {tablesToRender.map((table, tableIndex) => {
                    const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                    return (
                      <React.Fragment key={`colsel-frag-${tableIndex}`}>
                        {tableIndex > 0 && <TableCell sx={{ width: 16, minWidth: 16, p: 0, border: 'none !important' }} />}
                        {headerTokens.map((_, colIndex) => (
                          <TableCell key={`colsel-${tableIndex}-${colIndex}`} align="center" sx={{ width: 20, minWidth: 20, p: 0.25, border: 'none !important' }}>
                            {renderSelectorBox(
                              selectedColumns.some((c) => c.tableIndex === tableIndex && c.colIndex === colIndex),
                              () => toggleColumn(tableIndex, colIndex),
                              `Select column ${colIndex + 1}`
                            )}
                          </TableCell>
                        ))}
                      </React.Fragment>
                    )
                  })}
                  <TableCell className="tt-selector-corner-bottom" style={{ background: cornerBg }} sx={{ width: 20, minWidth: 20, p: 0, border: 'none !important' }} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )
    }

    const showSelectors = withSelectors
    return (
      <>
        {tablesToRender.map((table, tableIndex) => {
          const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
          return (
            <TableContainer 
              component={Paper} 
              key={`solution-tt-table-${tableIndex}`} 
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
                },
                '& .MuiTableCell-root': {
                  color: 'text.primary',
                  borderColor: 'divider',
                },
                '& .MuiTableHead-root .MuiTableCell-root:not(.tt-selector-corner)': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : undefined,
                },
                '& .MuiTableRow-root:nth-of-type(even)': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : undefined,
                },
                '& .tt-row-selector-cell, & .tt-selector-corner, & .tt-selector-corner-bottom': {
                  border: 'none !important',
                  borderBottom: 'none !important',
                },
                '& .tt-selector-row .MuiTableCell-root': {
                  border: 'none !important',
                  borderBottom: 'none !important',
                  backgroundColor: 'transparent !important',
                },
                '& .tt-row-selector-cell': {
                  backgroundColor: 'transparent !important',
                },
                '& .MuiTableHead-root .MuiTableCell-root.tt-selector-corner': {
                  backgroundColor: `${theme.palette.background.paper} !important`,
                },
              }}
            >
              {table.label && (
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {table.label}
                </Typography>
              )}
              <Table className="tt-table">
                <TableHead className="tt-head">
                  <TableRow className="tt-token-row">
                    {headerTokens.map((token, idx) => (
                      <TableCell
                        key={`solution-header-${tableIndex}-${idx}`}
                        className="tt-token"
                        align="center"
                      >
                        {token}
                      </TableCell>
                    ))}
                    {withSelectors && <TableCell className="tt-selector-corner" align="center" style={{ background: cornerBg }} sx={{ width: 20, minWidth: 20, p: 0 }} />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {table.rows.map((row, rowIndex) => (
                    <TableRow
                      key={`solution-row-${tableIndex}-${rowIndex}`}
                      className="tt-row"
                    >
                      {row.map((_, colIndex) => {
                        const colMatch = selectedColumns.some((c) => c.tableIndex === tableIndex && c.colIndex === colIndex)
                        const rowMatch = selectedRows.includes(rowIndex)
                        return (
                          <TableCell
                            key={`solution-cell-${tableIndex}-${rowIndex}-${colIndex}`}
                            className="tt-cell"
                            align="center"
                            sx={withSelectors && (colMatch || rowMatch) ? highlightStyle : undefined}
                          >
                            <TruthToggle
                              value={tableInputsToRender[tableIndex]?.[rowIndex]?.[colIndex]}
                              onChange={(token) => onCellChange?.(tableIndex, rowIndex, colIndex, token)}
                              ariaLabel={`Answer row ${rowIndex + 1} col ${colIndex + 1}`}
                              accent={false}
                              readOnly={readOnly}
                            />
                          </TableCell>
                        )
                      })}
                      {showSelectors && (
                        <TableCell className="tt-row-selector-cell" align="center" sx={{ width: 20, minWidth: 20, p: 0.25, verticalAlign: 'middle', border: 'none', background: 'transparent' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <ColumnRowSelectorBox
                              selected={selectedRows.includes(rowIndex)}
                              onClick={() => toggleRow(rowIndex)}
                              ariaLabel={`Select row ${rowIndex + 1}`}
                              theme={theme}
                            />
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {withSelectors && (
                    <TableRow className="tt-selector-row">
                      {headerTokens.map((_, colIndex) => (
                        <TableCell key={`colsel-${tableIndex}-${colIndex}`} align="center" sx={{ width: 20, minWidth: 20, p: 0.25, border: 'none !important' }}>
                          {renderSelectorBox(
                            selectedColumns.some((c) => c.tableIndex === tableIndex && c.colIndex === colIndex),
                            () => toggleColumn(tableIndex, colIndex),
                            `Select column ${colIndex + 1}`
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="tt-selector-corner-bottom" style={{ background: cornerBg }} sx={{ width: 20, minWidth: 20, p: 0, border: 'none !important' }} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )
        })}
      </>
    )
  }

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

  const promptContent = !embedded && (proof.description || truthTable.prompt)
    ? (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <PromptText content={truthTable.prompt || proof.description} />
        </Box>
      )
    : null

  const formulasLabel =
    !embedded && statements.length > 0
      ? kind === 'formula'
        ? statements[0]
        : kind === 'equivalence'
          ? `${statements[0]} ≡ ${statements[1]}`
          : kind === 'argument'
            ? `Premises: ${statements.slice(0, -1).join('; ')} → Conclusion: ${statements[statements.length - 1] ?? ''}`
            : null
      : null

  const tableCard = (
    <Box
      sx={{
        mt: embedded ? 0 : 1,
        overflow: 'visible',
        // no tall card styling
        minHeight: 'auto',
        flexGrow: 1,
        alignSelf: { xs: 'stretch', md: 'flex-start' },
      }}
      className={embedded ? undefined : 'lp-problem-card'}
    >
      <Stack spacing={3} sx={{ p: { xs: embedded ? 0 : 2, md: embedded ? 0 : 2 } }}>
        {!embedded && isInstructorView && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Tooltip title="Edit question">
              <Box
                component="span"
                onClick={openEdit}
                role="button"
                aria-label="Edit question"
                sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}
              >
                <EditIcon fontSize="small" />
              </Box>
            </Tooltip>
          </Box>
        )}
        {promptContent}
        {!embedded && !formulasLabel && (
          <Typography variant="body2" sx={{ color: 'primary.main' }}>
            Fill in each column to match the expected truth values.
          </Typography>
        )}
        {renderTableSet(tables, tableInputs, useCombinedTable, false, handleCellChange, kind === 'argument', true)}
        {classificationEnabled && classificationOptions.length > 0 && (
          <Box sx={{ width: '100%' }}>
            <FormControl component="fieldset" variant="standard">
              <FormLabel component="legend">
                {kind === 'argument' ? 'Is this argument valid or invalid?' : 'Select all that apply'}
              </FormLabel>
              {kind === 'argument' || kind === 'formula' ? (
                <RadioGroup
                  value={mcSelection[0] || ''}
                  onChange={(event) => {
                    const next = event.target.value ? [event.target.value] : []
                    updateClassificationSelection(next)
                  }}
                >
                  {classificationOptions.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      label={option.label}
                    />
                  ))}
                </RadioGroup>
              ) : (
                <FormGroup>
                  {classificationOptions.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      control={
                        <Checkbox
                          checked={mcSelection.includes(option.value)}
                          onChange={(event) => {
                            const checked = event.target.checked
                            const next = checked
                              ? [...mcSelection, option.value]
                              : mcSelection.filter((v) => v !== option.value)
                            updateClassificationSelection(next)
                          }}
                        />
                      }
                      label={option.label}
                    />
                  ))}
                </FormGroup>
              )}
            </FormControl>
          </Box>
        )}
        {!suppressReveal && showSolution && (!hideActions || embedded) && (
          <>
            {renderAnswerBlock(
              'Correct Answer',
              renderTableSet(
                displaySolutionTables,
                displaySolutionTables.map((table) => table.rows),
                displaySolutionTables.length > 1,
                true,
                null,
                kind === 'argument',
                false
              )
            )}
            {classificationEnabled && solutionMcValues.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Correct classification
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {solutionMcValues
                    .map((v) => classificationOptions.find((o) => o.value === v)?.label ?? v)
                    .join(', ')}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Stack>
    </Box>
  )

  if (solutionOnly && embedded && displaySolutionTables.length > 0) {
    return (
      <Stack spacing={2} sx={{ px: 0, width: '100%' }}>
        {renderAnswerBlock(
          'Correct Answer',
          renderTableSet(
            displaySolutionTables,
            displaySolutionTables.map((table) => table.rows),
            displaySolutionTables.length > 1,
            true,
            null,
            kind === 'argument',
            false
          )
        )}
        {classificationEnabled && solutionMcValues.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Correct classification
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {solutionMcValues
                .map((v) => classificationOptions.find((o) => o.value === v)?.label ?? v)
                .join(', ')}
            </Typography>
          </Box>
        )}
      </Stack>
    )
  }

  return (
    <Stack spacing={2} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      {embedded ? (
        tableCard
      ) : (
        <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {tableCard}
        </Box>
      )}
      <Typography
        variant="body2"
        sx={{
          color: 'primary.main',
          fontFamily: 'inherit',
          fontWeight: 400,
        }}
      >
        {tableCorrect
          ? 'Truth table looks good.'
          : tableFilledOnly
            ? 'Recheck your rows.'
            : 'Click cells to toggle truth values - fill in every cell to finish.'}
      </Typography>
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
          isDisabled={!tableFilled || attemptCount >= attemptLimit || isAssignmentLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={attemptLimit}
          isInstructorView={isInstructorView}
        />
      )}
      {isInstructorView && (
        <InstructorQuestionEditor
          ref={editorRef}
          proof={proof}
          isInstructorView
          onSaved={onQuestionSaved}
          trigger="none"
        />
      )}
    </Stack>
  )
}
