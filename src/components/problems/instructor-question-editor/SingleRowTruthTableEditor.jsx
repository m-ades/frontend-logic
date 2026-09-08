import * as React from 'react'
import { Box, Checkbox, FormControlLabel, Stack, TableCell, TextField, Typography } from '@mui/material'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { evaluateWithTokens } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import { DEFAULT_LOGIC_SYSTEM, getNotation } from '../../../lib/logicSystems.js'
import TruthTableGrid from '../truth-table/TruthTableGrid.jsx'
import { TruthValueButton } from '../truth-table/TruthTableControls.jsx'
import { buildAlignedTruthTableHeader, normalizeTruthTableCellValue } from '../truth-table/truthTableUi.js'
import { displayFormulaInput, normalizeFormulaInput } from './formulaHelpers.js'
import { typeKey } from './snapshotUtils.js'

/*
single row questions store the generated answer interpretation separately
the optional row marks given cells while null cells remain student editable
null row resets to generated atomic givens
*/
export function buildSingleRowTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const sr = proof.singleRowTruthTable || {}
  const statement = normalizeFormulaInput(edited.statement ?? sr.statement ?? sr.formula ?? proof.description ?? '', logicSystem)
  const prompt = edited.prompt ?? sr.prompt ?? proof.description ?? ''
  const sourceInterpretation = edited.interpretation
    ?? sr.interpretation
    ?? existing?.interpretation
    ?? {}
  const notation = getNotation(logicSystem)
  const syntax = getSyntax(notation)
  const Formula = getFormulaClass(notation)
  const formula = Formula.from(statement)
  const letters = formula.wellformed ? formula.allpletters : []
  const interpretation = Object.fromEntries(
    letters.map((letter) => [letter, sourceInterpretation[letter] ?? false])
  )
  const hasEditedRow = Object.prototype.hasOwnProperty.call(edited, 'row')
  const sourceRow = hasEditedRow ? edited.row : (sr.row ?? existing?.row)
  const evaluation = formula.wellformed
    ? evaluateWithTokens(formula, interpretation, notation)
    : null
  const tokens = evaluation?.tokens ?? []
  const rowLength = evaluation?.row.length ?? 0
  const row = Array.from({ length: rowLength }, (_, index) => {
    if (!Array.isArray(sourceRow)) {
      const token = tokens[index] ?? ''
      const atom = syntax.symbolfix(String(token).replace(/[()\[\]{}]/g, ''))
      return letters.includes(atom) ? Boolean(interpretation[atom]) : null
    }
    const cell = normalizeTruthTableCellValue(sourceRow[index])
    if (cell === 'T') return true
    if (cell === 'F') return false
    return null
  })
  return {
    [typeKey(existing)]: 'single-row-truth-table',
    prompt,
    statement,
    interpretation,
    row,
    partialCredit: Boolean(
      edited.partialCredit
      ?? existing?.partialCredit
      ?? proof?.partialCredit
      ?? false
    ),
  }
}

export function SingleRowTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const sr = proof?.singleRowTruthTable || {}
  const statement = value.statement ?? sr.statement ?? proof?.description ?? ''
  const prompt = value.prompt ?? sr.prompt ?? proof?.description ?? ''
  const interpretation = value.interpretation ?? sr.interpretation ?? {}
  const partialCredit = value.partialCredit
    ?? proof?.questionSnapshot?.partialCredit
    ?? proof?.partialCredit
    ?? false
  const notation = getNotation(logicSystem)
  const syntax = React.useMemo(() => getSyntax(notation), [notation])
  const Formula = React.useMemo(() => getFormulaClass(notation), [notation])
  const formula = React.useMemo(() => Formula.from(statement), [Formula, statement])
  const sentenceLetters = formula.wellformed
    ? [...formula.allpletters].sort((left, right) => left.localeCompare(right))
    : []
  const evaluation = React.useMemo(
    () => formula.wellformed
      ? evaluateWithTokens(formula, interpretation, notation)
      : null,
    [formula, interpretation, notation]
  )
  const tokens = evaluation?.tokens ?? []
  const headerTokens = React.useMemo(() => (
    buildAlignedTruthTableHeader(statement, syntax, tokens)
  ), [statement, syntax, tokens])
  const computedRow = React.useMemo(() => (
    (evaluation?.row ?? []).map((cell) => (
      cell ? 'T' : 'F'
    ))
  ), [evaluation])
  const atomForColumn = React.useCallback((index) => {
    const stripped = String(tokens[index] ?? '').replace(/[()\[\]{}]/g, '')
    const atom = syntax.symbolfix(stripped)
    return sentenceLetters.includes(atom) ? atom : null
  }, [tokens, sentenceLetters, syntax])

  const toggleValuesByColumn = React.useMemo(() => headerTokens.map((_, index) => (
    atomForColumn(index) ? ['T', 'F'] : [computedRow[index]]
  )), [headerTokens, atomForColumn, computedRow])
  const hasEditedRow = Object.prototype.hasOwnProperty.call(value, 'row')
  const sourceRow = hasEditedRow
    ? (Array.isArray(value.row) ? value.row : null)
    : (Array.isArray(sr.row) ? sr.row : null)
  const givenRow = headerTokens.map((_, index) => {
    if (!sourceRow) return atomForColumn(index) ? computedRow[index] : ''
    const cell = normalizeTruthTableCellValue(sourceRow[index])
    return cell === 'T' || cell === 'F' ? cell : ''
  })
  const setCell = (index, nextValue) => {
    const atom = atomForColumn(index)
    const nextInterpretation = atom && nextValue
      ? { ...interpretation, [atom]: nextValue === 'T' }
      : interpretation
    const evaluatedRow = evaluateWithTokens(formula, nextInterpretation, notation).row
    const nextRow = givenRow.map((cell, currentIndex) => {
      const isGiven = currentIndex === index ? Boolean(nextValue) : Boolean(cell)
      return isGiven ? Boolean(evaluatedRow[currentIndex]) : null
    })
    onChange({
      ...value,
      row: nextRow,
      interpretation: nextInterpretation,
    })
  }
  return (
    <Stack spacing={2}>
      <TextField label="Statement" value={statement} onChange={(e) => onChange({ ...value, statement: displayFormulaInput(e.target.value, logicSystem), row: null, interpretation: {} })} fullWidth variant="outlined" />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Truth values</Typography>
        {headerTokens.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Enter a valid statement</Typography>
        ) : (
          <Stack spacing={0.5} alignItems="flex-start">
            <TruthTableGrid
              tables={[{ tokens: headerTokens, headerTokens, rows: [givenRow] }]}
              tableInputs={[[givenRow]]}
              combined={false}
              readOnly={false}
              withSelectors={false}
              allowRowSelection={false}
              shrinkWrap
              renderCell={({ colIndex, cellValue, cellSx }) => {
                return (
                  <TableCell key={`single-row-editor-cell-${colIndex}`} align="center" sx={cellSx}>
                    <TruthValueButton
                      value={cellValue ?? ''}
                      onChange={(nextValue) => setCell(colIndex, nextValue)}
                      ariaLabel={`Given value for ${headerTokens[colIndex]}`}
                      emptyLabel="?"
                      toggleValues={toggleValuesByColumn[colIndex]}
                    />
                  </TableCell>
                )
              }}
            />
          </Stack>
        )}
      </Box>
      <TextField label="Prompt" multiline minRows={1} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <FormControlLabel
        control={(
          <Checkbox
            checked={Boolean(partialCredit)}
            onChange={(event) => onChange({ ...value, partialCredit: event.target.checked })}
          />
        )}
        label="Allow partial credit"
      />
    </Stack>
  )
}
