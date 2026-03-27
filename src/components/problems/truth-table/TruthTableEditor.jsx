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
} from '@mui/material'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import {
  multiTables,
} from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import { fullTableMatch } from '../../../lib/logicpenguin/checkers/truth-tables.js'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import ProblemFrame from '../mui/frame/ProblemFrame.jsx'
import TruthTableGrid from './TruthTableGrid.jsx'
import TruthTableSection from './TruthTableSection.jsx'
import {
  buildDisplaySolutionTables,
  buildTruthTableStatePayload,
  buildTruthTableSubmissionData,
  deriveTruthTableSolutionClassification,
  normalizeSavedClassification,
  submitTruthTableAnswer,
  tokenizeTruthTableHeader,
} from './truthTableUi.js'
import PromptText from '../../ui/PromptText.jsx'
import { tablesEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'

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
  problemLabel,
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
      return {
        label,
        tokens: res.tables[idx]?.tokens ?? [],
        rows: res.tables[idx]?.rows ?? [],
        headerTokens: tokenizeTruthTableHeader(statement, syntax),
      }
    })
  }, [Formula, statements, syntax])

  const isAtomicToken = React.useCallback(
    (token) => {
      if (!token) return false
      const stripped = token.replace(/[()\[\]{}]/g, '')
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
    [expectedTables, isAtomicToken, savedState?.tables, tables]
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
  const assignmentQuestionId = proof?.questionId ?? null
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
  React.useEffect(() => () => clearDebounce(onStateChangeTimerRef), [])
  const scheduleStateChange = React.useCallback((nextState) => {
    scheduleDebouncedChange(onStateChangeTimerRef, onStateChange, nextState)
  }, [onStateChange])
  const updateClassificationSelection = React.useCallback((next) => {
    setMcSelection(next)
    onStateChange?.(buildTruthTableStatePayload(tableInputs, next))
    if (status !== 'unanswered') {
      setStatus('unanswered')
      setMessage('')
    }
  }, [onStateChange, status, tableInputs])

  React.useEffect(() => {
    if (proof?.id === lastRestoredProofIdRef.current) return
    lastRestoredProofIdRef.current = proof?.id
    setTableInputs((prev) => (tablesEqual(prev, derivedInitialTables) ? prev : derivedInitialTables))
    setMcSelection(normalizeSavedClassification(kind, savedState))
  }, [derivedInitialTables, kind, proof?.id, savedState?.mcans, savedState?.taut, savedState?.contra, savedState?.valid, savedState?.equiv])

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
    scheduleStateChange(buildTruthTableStatePayload(nextTables, mcSelection))
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

  const useCombinedTable = tables.length > 1
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
      const result = await submitTruthTableAnswer({
        assignmentQuestionId,
        submissionData: buildTruthTableSubmissionData(kind, tableInputs, mcSelection, classificationEnabled),
        localIsCorrect: tableCorrect && (!classificationEnabled || mcSelection.length > 0),
        attemptLimit,
        classificationEnabled,
        selection: mcSelection,
      })
      if (result.mode === 'remote') {
        const resp = result.response
        if (typeof resp?.attempt_limit === 'number') {
          setAttemptLimit(resp.attempt_limit)
        }
        setAttemptCount((prev) => resp?.submission?.attempt ?? Math.min(prev + 1, attemptLimit))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('assignment-submission', {
            detail: {
              assignmentQuestionId,
              attempt: resp?.submission?.attempt,
              attemptLimit: resp?.attempt_limit,
              isCorrect: result.isCorrect,
              score: result.score,
            },
          }))
        }
        if (result.isCorrect) {
          setStatus('correct')
          setMessage(result.message)
          onProofComplete?.(proof.id)
        } else if (result.nextStatus === 'partial') {
          setStatus('partial')
          setMessage(result.message)
        } else {
          setStatus('incorrect')
          setMessage(result.message)
        }
      } else {
        setAttemptCount((prev) => Math.min(prev + 1, attemptLimit))
        if (result.isCorrect) {
          setStatus('correct')
          setMessage(result.message)
          onProofComplete?.(proof.id)
        } else {
          setStatus('incorrect')
          setMessage(result.message)
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
    onStateChange?.(buildTruthTableStatePayload(resetTables, []))
    setMcSelection([])
    setStatus('unanswered')
    setMessage('')
  }
  const isPrefilledCell = React.useCallback(
    ({ tableIndex, colIndex }) => isAtomicToken(tables[tableIndex]?.tokens?.[colIndex]),
    [isAtomicToken, tables]
  )
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
  const displaySolutionTables = React.useMemo(
    () => buildDisplaySolutionTables(proof?.solution, solutionTablesFromProblem, proof?.description || 'Answer'),
    [proof?.description, proof?.solution, solutionTablesFromProblem]
  )
  const effectiveStatus = embedded && parentStatus != null ? parentStatus : status
  const effectiveAttemptCount = embedded && parentAttemptCount != null ? parentAttemptCount : attemptCount
  const effectiveAttemptLimit = embedded && parentAttemptLimit != null ? parentAttemptLimit : attemptLimit
  const showSolution =
    effectiveAttemptCount >= effectiveAttemptLimit && effectiveStatus !== 'correct' && displaySolutionTables.length > 0

  // Correct multiple-choice answer for solution reveal (from proof.solution or derived from problem)
  const solutionMcValues = React.useMemo(
    () => deriveTruthTableSolutionClassification(kind, proof?.solution, statements, Formula),
    [Formula, kind, proof?.solution, statements]
  )

  const promptContent = embedded && (proof.description || truthTable.prompt)
    ? (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <PromptText content={truthTable.prompt || proof.description} />
        </Box>
      )
    : null

  const tableCard = (
    <Box
      sx={{
        mt: embedded ? 0 : 1,
      }}
    >
      <Stack spacing={3} sx={{ p: { xs: embedded ? 0 : 2, md: embedded ? 0 : 2 } }}>
        {promptContent}
        <TruthTableGrid
          tables={tables}
          tableInputs={tableInputs}
          combined={useCombinedTable}
          readOnly={false}
          onCellChange={handleCellChange}
          showConclusionMarker={kind === 'argument'}
          withSelectors
          selectedColumns={selectedColumns}
          selectedRows={selectedRows}
          onToggleColumn={toggleColumn}
          onToggleRow={toggleRow}
          isCellReadOnly={isPrefilledCell}
        />
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
            <TruthTableSection title="Correct Answer">
              <TruthTableGrid
                tables={displaySolutionTables}
                tableInputs={displaySolutionTables.map((table) => table.rows)}
                combined={displaySolutionTables.length > 1}
                readOnly
                showConclusionMarker={kind === 'argument'}
                withSelectors={false}
              />
            </TruthTableSection>
            {classificationEnabled && solutionMcValues.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography component="p" variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
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
        <TruthTableSection title="Correct Answer">
          <TruthTableGrid
            tables={displaySolutionTables}
            tableInputs={displaySolutionTables.map((table) => table.rows)}
            combined={displaySolutionTables.length > 1}
            readOnly
            showConclusionMarker={kind === 'argument'}
            withSelectors={false}
          />
        </TruthTableSection>
        {classificationEnabled && solutionMcValues.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography component="p" variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
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
    embedded ? (
      tableCard
    ) : (
      <ProblemFrame
        problemLabel={problemLabel}
        prompt={truthTable.prompt || proof.description}
        minHeight="auto"
        cardMaxWidth="1060px"
        isInstructorView={isInstructorView}
        onEditQuestion={openEdit}
        status={status}
        message={message}
        onCloseStatus={() => setMessage('')}
        actionNode={!hideActions ? (
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
        ) : null}
        editorNode={isInstructorView ? (
          <InstructorQuestionEditor
            ref={editorRef}
            proof={proof}
            isInstructorView
            onSaved={onQuestionSaved}
            trigger="none"
          />
        ) : null}
      >
        {tableCard}
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
              : 'Click editable cells to toggle truth values - fill in every blank cell to finish.'}
        </Typography>
      </ProblemFrame>
    )
  )
}
