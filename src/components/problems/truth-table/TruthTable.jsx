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
import ProblemFrame from '../mui/frame/ProblemFrame.jsx'
import TruthTableGrid from './TruthTableGrid.jsx'
import TruthTableSection from './TruthTableSection.jsx'
import {
  buildDisplaySolutionTables,
  buildTruthTableStatePayload,
  buildTruthTableSubmissionData,
  deriveTruthTableSolutionClassification,
  getTruthTableClassification,
  isAtomicTruthTableToken,
  normalizeSavedClassification,
  submitTruthTableAnswer,
  tokenizeTruthTableHeader,
} from './truthTableUi.js'
import PromptText from '../../ui/PromptText.jsx'
import { tablesEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'
import { getNotation } from '../../../lib/logicSystems.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'

const KIND_BY_PROOF_TYPE = {
  'formula-truth-table': 'formula',
  'equivalence-truth-table': 'equivalence',
  'argument-truth-table': 'argument',
}

export default function TruthTable({
  proof,
  savedState,
  onStateChange,
  onProofComplete,
  hideActions = false,
  suppressReveal = false,
  embedded = false,
  logicSystem,
}) {
  const truthTable = proof.truthTable ?? {}
  const notation = getNotation(logicSystem)
  const syntax = React.useMemo(() => getSyntax(notation), [notation])
  const Formula = React.useMemo(() => getFormulaClass(notation), [notation])
  const kind = truthTable.kind
    ?? KIND_BY_PROOF_TYPE[proof?.type]
    ?? (truthTable.lefts && truthTable.right ? 'argument' : null)
    ?? (truthTable.statements?.length > 1 ? 'equivalence' : null)
    ?? (truthTable.left && truthTable.right ? 'equivalence' : 'formula')
  const tableConfig = React.useMemo(() => {
    const base = { ...truthTable, kind }
    if (kind === 'formula') {
      if (base.statement === undefined || base.statement === '') {
        base.statement = proof?.statement ?? proof?.formula ?? ''
      }
      if (base.formula === undefined || base.formula === '') {
        base.formula = proof?.formula ?? proof?.statement ?? ''
      }
    }
    if (kind === 'equivalence') {
      if (!Array.isArray(base.statements) || base.statements.length === 0) {
        const proofStatements = proof?.statements ?? proof?.formulas
        if (Array.isArray(proofStatements) && proofStatements.length > 0) {
          base.statements = proofStatements
        } else {
          const left = base.left ?? proof?.left ?? proof?.leftFormula ?? proof?.formulaLeft ?? ''
          const right = base.right ?? proof?.right ?? proof?.rightFormula ?? proof?.formulaRight ?? proof?.conclusion ?? proof?.conc ?? ''
          base.statements = [left, right]
        }
      }
    }
    if (kind === 'argument') {
      if (!Array.isArray(base.lefts) || base.lefts.length === 0) {
        base.lefts = proof?.lefts ?? proof?.premises ?? proof?.prems ?? []
      }
      if (base.right === undefined || base.right === '') {
        base.right = proof?.right ?? proof?.conclusion ?? proof?.conc ?? ''
      }
    }
    if (!base.prompt && proof?.description) {
      base.prompt = proof.description
    }
    return base
  }, [kind, proof, truthTable])
  const classificationEnabled = React.useMemo(() => {
    return Boolean(
      tableConfig?.options?.question ??
      proof?.options?.question ??
      false
    )
  }, [proof?.options?.question, tableConfig?.options?.question])
  const classification = React.useMemo(
    () => getTruthTableClassification(kind),
    [kind]
  )
  const classificationOptions = classificationEnabled ? classification.options : []
  const operatorSet = React.useMemo(() => new Set(Object.keys(syntax.operators)), [syntax])
  const statements = React.useMemo(() => {
    if (Array.isArray(tableConfig.statements) && tableConfig.statements.length > 0) {
      return tableConfig.statements
    }
    if (Array.isArray(tableConfig.formulas) && tableConfig.formulas.length > 0) {
      return tableConfig.formulas
    }
    if (kind === 'argument' && tableConfig.lefts && tableConfig.right) {
      return [...tableConfig.lefts, tableConfig.right]
    }
    if (tableConfig.statement || tableConfig.formula) {
      return [tableConfig.statement ?? tableConfig.formula]
    }
    return []
  }, [kind, tableConfig])

  const tables = React.useMemo(() => {
    if (statements.length === 0) return []
    const wffs = statements.map((statement) => Formula.from(statement))
    const res = multiTables(wffs, notation)
    return statements.map((label, idx) => {
      const statement = statements[idx]
      return {
        label: displayIndexedSymbolsForNotation(label, syntax.notationname),
        tokens: res.tables[idx]?.tokens ?? [],
        rows: res.tables[idx]?.rows ?? [],
        headerTokens: tokenizeTruthTableHeader(statement, syntax),
      }
    })
  }, [Formula, statements, syntax])

  const isAtomicToken = React.useCallback(
    (token) => isAtomicTruthTableToken(token, operatorSet, syntax),
    [operatorSet, syntax]
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
  const [selectedColumns, setSelectedColumns] = React.useState([])
  const [selectedRows, setSelectedRows] = React.useState([])
  const lastRestoredProofIdRef = React.useRef(undefined)
  const onStateChangeTimerRef = React.useRef(null)
  React.useEffect(() => {
    // use per-proof limit
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
  const toggleColumn = React.useCallback((tableIndex, colIndex) => {
    setSelectedColumns((prev) => {
      const has = prev.some((col) => col.tableIndex === tableIndex && col.colIndex === colIndex)
      return has
        ? prev.filter((col) => !(col.tableIndex === tableIndex && col.colIndex === colIndex))
        : [...prev, { tableIndex, colIndex }]
    })
  }, [])
  const toggleRow = React.useCallback((rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((row) => row !== rowIndex) : [...prev, rowIndex]
    )
  }, [])

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
    scheduleStateChange(buildTruthTableStatePayload(nextTables, classificationEnabled ? mcSelection : []))
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
  const solutionMcValues = React.useMemo(
    () => deriveTruthTableSolutionClassification(kind, proof?.solution, statements, Formula, notation),
    [Formula, kind, notation, proof?.solution, statements]
  )
  const classificationCorrect = !classificationEnabled || (
    kind === 'equivalence'
      ? mcSelection.length === solutionMcValues.length &&
        mcSelection.every((value) => solutionMcValues.includes(value))
      : mcSelection.length > 0
  )

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
        localIsCorrect: tableCorrect && classificationCorrect,
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
  const showSolution =
    attemptCount >= attemptLimit && status !== 'correct' && displaySolutionTables.length > 0

  const promptContent = embedded && (proof.description || tableConfig.prompt)
    ? (
        <PromptText content={tableConfig.prompt || proof.description} />
      )
    : null

  const tableCard = (
    <Box
      sx={{
        mt: embedded ? 0 : 1,
      }}
    >
      <Stack spacing={1.5} sx={{ p: { xs: embedded ? 0 : 2, md: embedded ? 0 : 2 } }}>
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
                {classification.prompt}
              </FormLabel>
              {classification.selectionMode === 'single' ? (
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
        {!hideActions && !suppressReveal && showSolution && (
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

  return (
    embedded ? (
      <Stack spacing={2} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
        {tableCard}
        <Typography
          variant="body2"
          sx={{
            color: 'primary.main',
            fontFamily: 'inherit',
            fontWeight: 400,
          }}
        >
          {tableFilledOnly && tableCorrect
            ? 'Truth table looks good.'
            : tableFilledOnly
              ? 'Recheck your rows.'
              : 'Click editable cells to toggle truth values - fill in every blank cell to finish.'}
        </Typography>
      </Stack>
    ) : (
      <ProblemFrame
        prompt={tableConfig.prompt || proof.description}
        minHeight="auto"
        cardMaxWidth="1060px"
        status={status}
        message={message}
        onCloseStatus={() => setMessage('')}
        actionNode={!hideActions ? (
          <ProblemSetButtons
            onCheck={handleCheck}
            onStartOver={handleStartOver}
            isChecking={isChecking}
            isDisabled={!tableFilled || attemptCount >= attemptLimit}
            align="flex-start"
            attemptCount={attemptCount}
            attemptLimit={attemptLimit}
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
          {tableFilledOnly && tableCorrect
            ? 'Truth table looks good.'
            : tableFilledOnly
              ? 'Recheck your rows.'
              : 'Click editable cells to toggle truth values - fill in every blank cell to finish.'}
        </Typography>
      </ProblemFrame>
    )
  )
}
