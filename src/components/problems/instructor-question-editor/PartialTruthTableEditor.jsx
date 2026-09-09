import * as React from 'react'
import { Box, Stack, TableCell, TextField, Typography } from '@mui/material'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { DEFAULT_LOGIC_SYSTEM, getNotation } from '../../../lib/logicSystems.js'
import TruthTableGrid from '../truth-table/TruthTableGrid.jsx'
import { TruthValueButton } from '../truth-table/TruthTableControls.jsx'
import { tokenizeTruthTableHeader } from '../truth-table/truthTableUi.js'
import { displayFormulaInput, normalizeFormulaInput } from './formulaHelpers.js'
import { typeKey } from './snapshotUtils.js'

export function buildPartialTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const pt = proof.partialTruthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const statement = normalizeFormulaInput(edited.statement ?? pt.statement ?? pt.formula ?? '', logicSystem)
  const prompt = edited.prompt ?? pt.prompt ?? proof.description ?? ''
  const row = Array.isArray(edited.row) ? edited.row : (pt.row || [])
  return { [typeKey(e)]: 'partial-truth-table', prompt, statement, row }
}

export function PartialTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const pt = proof?.partialTruthTable || {}
  const statement = value.statement ?? pt.statement ?? pt.formula ?? proof?.description ?? ''
  const prompt = value.prompt ?? pt.prompt ?? proof?.description ?? ''
  const notation = getNotation(logicSystem)
  const syntax = React.useMemo(() => getSyntax(notation), [notation])
  const Formula = React.useMemo(() => getFormulaClass(notation), [notation])
  const headerTokens = React.useMemo(() => {
    if (!statement) return []
    const formula = Formula.from(statement)
    return formula.wellformed ? tokenizeTruthTableHeader(statement, syntax) : []
  }, [Formula, statement, syntax])
  const savedRow = Array.isArray(value.row)
    ? value.row
    : (Array.isArray(pt.row) ? pt.row : [])
  const row = headerTokens.map((_, index) => {
    const cell = savedRow[index]
    if (cell === true || cell === 'T' || cell === 't') return 'T'
    if (cell === false || cell === 'F' || cell === 'f') return 'F'
    return ''
  })
  const setCell = (index, cell) => {
    const nextRow = row.map((current, currentIndex) => {
      const next = currentIndex === index ? cell : current
      if (next === 'T') return true
      if (next === 'F') return false
      return null
    })
    onChange({ ...value, row: nextRow })
  }
  const tables = [{ tokens: headerTokens, headerTokens, rows: [row] }]
  return (
    <Stack spacing={2}>
      <TextField
        label="Statement"
        value={statement}
        onChange={(e) => onChange({
          ...value,
          statement: displayFormulaInput(e.target.value, logicSystem),
          row: [],
        })}
        fullWidth
        variant="outlined"
      />
      <TextField label="Prompt" value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Given row</Typography>
        {headerTokens.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Enter a valid statement</Typography>
        ) : (
          <TruthTableGrid
            tables={tables}
            tableInputs={[[row]]}
            combined={false}
            readOnly={false}
            withSelectors={false}
            allowRowSelection={false}
            shrinkWrap
            renderCell={({ colIndex, cellValue, cellSx }) => (
              <TableCell key={`partial-editor-cell-${colIndex}`} align="center" sx={cellSx}>
                <TruthValueButton
                  value={cellValue ?? ''}
                  onChange={(nextValue) => setCell(colIndex, nextValue)}
                  ariaLabel={`Given value for ${headerTokens[colIndex]}`}
                  emptyLabel="?"
                />
              </TableCell>
            )}
          />
        )}
      </Box>
    </Stack>
  )
}
