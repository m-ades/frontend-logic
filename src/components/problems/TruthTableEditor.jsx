import * as React from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import getFormulaClass from '../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../lib/logicpenguin/symbolic/libsyntax.js'
import { multiTables } from '../../lib/logicpenguin/symbolic/libsemantics.js'
import { fullTableMatch } from '../../lib/logicpenguin/checkers/truth-tables.js'
import ProblemSetButtons from './mui/ProblemSetButtons.jsx'
import { API_CONFIG, fetchJson } from '../../utils/api.js'

function TruthToggle({ value, onChange, ariaLabel, accent, readOnly = false }) {
  const cycleValue = (current) => {
    if (!current) return 'T'
    if (current === 'T') return 'F'
    return ''
  }

  const handleClick = () => {
    if (readOnly) return
    onChange(cycleValue(value))
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
        fontSize: '0.85rem',
        fontWeight: 700,
        color: value === 'T' ? (accent ? '#1e55ff' : '#2f6bff')
          : value === 'F'
            ? '#b22'
            : accent ? '#2f6bff' : 'rgba(0, 0, 0, 0.25)',
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        width: 28,
        height: 28,
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        transition: 'color 0.15s ease',
        '&:hover': {
          color: '#2f6bff',
        },
        '&:focus-visible': {
          outline: '2px solid rgba(47, 107, 255, 0.6)',
          outlineOffset: 2,
        },
      }}
    >
      {value || '-'}
    </Box>
  )
}

export default function TruthTableEditor({ proof, savedState, onStateChange, onProofComplete }) {
  const truthTable = proof.truthTable ?? {}
  const syntax = React.useMemo(() => getSyntax(), [])
  const Formula = React.useMemo(() => getFormulaClass(), [])
  const kind = truthTable.kind
    ?? (truthTable.left && truthTable.right ? 'equivalence' : 'formula')
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

  const [tableInputs, setTableInputs] = React.useState(derivedInitialTables)
  const [status, setStatus] = React.useState('unanswered')
  const [message, setMessage] = React.useState('')
  const [isChecking, setIsChecking] = React.useState(false)
  const [attemptCount, setAttemptCount] = React.useState(savedState?.attemptCount ?? 0)
  const attemptLimit = proof?.attemptLimit ?? 3
  const assignmentQuestionId = Number(proof?.questionId || 0)

  React.useEffect(() => {
    setTableInputs(derivedInitialTables)
  }, [derivedInitialTables])

  const handleCellChange = (tableIndex, rowIndex, colIndex, value) => {
    setTableInputs((prev) => {
      const next = prev.map((tableRows, tIdx) =>
        tIdx === tableIndex
          ? tableRows.map((row, rIdx) =>
              rIdx === rowIndex
                ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
                : row
            )
          : tableRows
      )
      onStateChange?.({
        tables: next.map((rows) => ({ rows })),
      })
      return next
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
  const tableFilled =
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

  const tableCorrect =
    hasTruthTable &&
    tableChecks.length > 0 &&
    tableChecks.every((res) => res.rowdiff === 0 && res.offcells.length === 0)

  const completionRef = React.useRef(false)

  React.useEffect(() => {
    if (!hasTruthTable) return
    if (tableCorrect && !completionRef.current) {
      completionRef.current = true
      onProofComplete?.(proof.id)
    } else if (!tableCorrect && completionRef.current) {
      completionRef.current = false
    }
  }, [hasTruthTable, tableCorrect, onProofComplete, proof.id])

  if (!hasTruthTable) {
    return (
      <Stack spacing={2} sx={{ px: 0, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#2f6bff' }}>
          Truth Table Task
        </Typography>
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

    if (tableData.length === 0) {
      return { lefts: [], right: { rows: [] }, rowhls: [] }
    }

    if (kind === 'formula') {
      return { lefts: [], right: tableData[0], rowhls: [] }
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
      }
    }

    return { lefts: [], right: tableData[0], rowhls: [] }
  }

  const handleCheck = async () => {
    if (isChecking || attemptCount >= attemptLimit) return
    setIsChecking(true)
    try {
      if (assignmentQuestionId) {
        const resp = await fetchJson('/api/validate/submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_question_id: assignmentQuestionId,
            user_id: API_CONFIG.userId,
            submission_data: buildSubmissionData(),
          }),
        })
        const validation = resp?.validation || {}
        const success = validation.successstatus === 'correct'
        setAttemptCount((prev) => resp?.submission?.attempt ?? Math.min(prev + 1, attemptLimit))
        if (success) {
          setStatus('correct')
          setMessage('Correct!')
          onProofComplete?.(proof.id)
        } else {
          setStatus('incorrect')
          setMessage(validation.message || validation.transmessage || 'Incorrect. Please try again.')
        }
      } else {
        setAttemptCount((prev) => Math.min(prev + 1, attemptLimit))
        if (tableCorrect) {
          setStatus('correct')
          setMessage('Correct!')
          onProofComplete?.(proof.id)
        } else {
          setStatus('incorrect')
          setMessage('Incorrect. Please try again.')
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
    setTableInputs(derivedInitialTables)
    onStateChange?.({
      tables: derivedInitialTables.map((rows) => ({ rows })),
    })
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
  const showSolution = attemptCount >= attemptLimit && solutionTables.length > 0

  const renderTableSet = (tablesToRender, tableInputsToRender, combined, readOnly, onCellChange, showConclusionMarker) => {
    if (combined) {
      return (
        <Box className="tt-table-wrap">
          <Box
            component="table"
            className="tt-table"
          >
            <Box component="thead" className="tt-head">
              <Box component="tr" className="tt-group-row">
                {tablesToRender.map((table, tableIndex) => {
                  const isConclusion = showConclusionMarker && tableIndex === tablesToRender.length - 1 && tablesToRender.length > 1
                  return (
                    <Box
                      component="th"
                      key={`solution-group-${tableIndex}`}
                      colSpan={table.tokens.length || 1}
                      className={
                        isConclusion
                          ? 'tt-group tt-conclusion'
                          : tableIndex < tablesToRender.length - 1
                            ? 'tt-group tt-divider'
                            : 'tt-group'
                      }
                    >
                      {isConclusion ? '// ' : ''}
                      {table.label || ''}
                    </Box>
                  )
                })}
              </Box>
              <Box component="tr" className="tt-token-row">
                {tablesToRender.map((table, tableIndex) => {
                  const isConclusion = showConclusionMarker && tableIndex === tablesToRender.length - 1 && tablesToRender.length > 1
                  return (
                    <React.Fragment key={`solution-tokenfrag-${tableIndex}`}>
                      {(table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens).map((token, tokenIndex) => {
                        const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                        return (
                          <Box
                            component="th"
                            key={`solution-header-${tableIndex}-${tokenIndex}`}
                            className={
                              isConclusion
                                ? 'tt-token tt-conclusion'
                                : tokenIndex === headerTokens.length - 1 && tableIndex < tablesToRender.length - 1
                                  ? 'tt-token tt-divider'
                                  : 'tt-token'
                            }
                          >
                            {token}
                          </Box>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </Box>
            </Box>
            <Box component="tbody">
              {(tablesToRender[0]?.rows ?? []).map((_, rowIndex) => (
                <Box
                  component="tr"
                  key={`solution-row-${rowIndex}`}
                  className="tt-row"
                >
                  {tablesToRender.map((table, tableIndex) => {
                    const isConclusion = showConclusionMarker && tableIndex === tablesToRender.length - 1 && tablesToRender.length > 1
                    return (
                      <React.Fragment key={`solution-rowfrag-${tableIndex}`}>
                        {table.rows[rowIndex].map((_, colIndex) => (
                          <Box
                            component="td"
                            key={`solution-cell-${tableIndex}-${rowIndex}-${colIndex}`}
                              className={
                                isConclusion
                                  ? 'tt-cell tt-conclusion-cell'
                                  : colIndex === table.tokens.length - 1 &&
                                    tableIndex < tablesToRender.length - 1
                                    ? 'tt-cell tt-divider'
                                    : 'tt-cell'
                              }
                          >
                            <TruthToggle
                              value={tableInputsToRender[tableIndex]?.[rowIndex]?.[colIndex]}
                              onChange={(token) => onCellChange?.(tableIndex, rowIndex, colIndex, token)}
                              ariaLabel={`Answer row ${rowIndex + 1} col ${colIndex + 1}`}
                              accent={false}
                              readOnly={readOnly}
                            />
                          </Box>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )
    }

    return (
      <>
        {tablesToRender.map((table, tableIndex) => (
          <Box key={`solution-tt-table-${tableIndex}`} className="tt-table-wrap">
            {table.label && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {table.label}
              </Typography>
            )}
            <Box
              component="table"
              className="tt-table"
            >
              <Box component="thead" className="tt-head">
                <Box component="tr" className="tt-token-row">
                  {(table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens).map((token, idx) => (
                    <Box
                      component="th"
                      key={`solution-header-${tableIndex}-${idx}`}
                      className="tt-token"
                    >
                      {token}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {table.rows.map((row, rowIndex) => (
                  <Box
                    component="tr"
                    key={`solution-row-${tableIndex}-${rowIndex}`}
                    className="tt-row"
                  >
                    {row.map((_, colIndex) => (
                      <Box
                        component="td"
                        key={`solution-cell-${tableIndex}-${rowIndex}-${colIndex}`}
                        className="tt-cell"
                      >
                        <TruthToggle
                          value={tableInputsToRender[tableIndex]?.[rowIndex]?.[colIndex]}
                          onChange={(token) => onCellChange?.(tableIndex, rowIndex, colIndex, token)}
                          ariaLabel={`Answer row ${rowIndex + 1} col ${colIndex + 1}`}
                          accent={false}
                          readOnly={readOnly}
                        />
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        ))}
      </>
    )
  }

  const renderAnswerCard = (title, body) => (
    <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1 }}>
      <Box
        sx={{
          mt: 1,
          overflow: 'visible',
          minHeight: '420px',
          flexGrow: 1,
          alignSelf: { xs: 'stretch', md: 'flex-start' },
        }}
        className="lp-problem-card"
      >
        <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2f6bff' }}>
            {title}
          </Typography>
          {body}
        </Stack>
      </Box>
    </Box>
  )

  return (
    <Stack spacing={2} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, color: '#2f6bff' }}>
        Truth Table Task
      </Typography>
      {(proof.description || truthTable.prompt) && (
        <Typography variant="body1" sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}>
          {truthTable.prompt || proof.description}
        </Typography>
      )}
      <Typography variant="body2" sx={{ color: '#2f6bff' }}>
        Fill in each column to match the expected truth values.
      </Typography>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            mt: 1,
            overflow: 'visible',
            minHeight: '420px',
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
          className="lp-problem-card"
        >
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            {renderTableSet(tables, tableInputs, useCombinedTable, false, handleCellChange, kind === 'argument')}
          </Stack>
        </Box>
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: tableCorrect ? '#76b947' : tableFilled ? '#d58b00' : '#2f6bff',
          fontWeight: tableFilled ? 600 : 500,
        }}
      >
        {tableCorrect
          ? 'All rows match!'
          : tableFilled
            ? 'Table filled. Check your rows.'
            : 'Complete every cell to finish.'}
      </Typography>
      {message && (
        <Alert
          severity={status === 'correct' ? 'success' : status === 'incorrect' ? 'error' : 'info'}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}
      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={!tableFilled || attemptCount >= attemptLimit}
      />
      {showSolution && renderAnswerCard(
        'Correct Answer',
        renderTableSet(
          solutionTables,
          solutionTables.map((table) => table.rows),
          solutionTables.length > 1,
          true,
          null,
          kind === 'argument'
        )
      )}
    </Stack>
  )
}
