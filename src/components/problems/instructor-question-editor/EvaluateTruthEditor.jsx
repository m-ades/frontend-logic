import * as React from 'react'
import { FormControl, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material'
import { DEFAULT_LOGIC_SYSTEM, getSymbols } from '../../../lib/logicSystems.js'
import { normalizeFormulaInput } from './formulaHelpers.js'
import FormulaField from '../mui/inputs/FormulaField.jsx'
import { typeKey } from './snapshotUtils.js'

export function buildEvaluateTruthSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const e = existing && typeof existing === 'object' ? existing : {}
  const statement = normalizeFormulaInput(edited.statement ?? proof.evaluateTruth ?? proof.description ?? '', logicSystem)
  const answer = edited.answer !== undefined ? edited.answer : (proof.answer ?? false)
  return { [typeKey(e)]: 'evaluate-truth', prompt: statement, statement, answer: Boolean(answer) }
}

export function EvaluateTruthEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const statement = value.statement ?? proof?.evaluateTruth ?? proof?.description ?? ''
  const answer = value.answer ?? proof?.answer ?? false
  const symbols = getSymbols(logicSystem)
  return (
    <Stack spacing={2}>
      <FormulaField label="Statement" value={statement} onValueChange={(next) => onChange({ ...value, statement: next })} logicSystem={logicSystem} fullWidth variant="outlined" placeholder={`e.g. P ${symbols.and} Q`} />
      <FormControl>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Correct answer</Typography>
        <RadioGroup row value={answer ? 'true' : 'false'} onChange={(e) => onChange({ ...value, answer: e.target.value === 'true' })}>
          <FormControlLabel value="true" control={<Radio />} label="True" />
          <FormControlLabel value="false" control={<Radio />} label="False" />
        </RadioGroup>
      </FormControl>
    </Stack>
  )
}
