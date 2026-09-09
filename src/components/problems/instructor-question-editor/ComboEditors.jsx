import * as React from 'react'
import { Stack, TextField } from '@mui/material'
import { DEFAULT_LOGIC_SYSTEM, getSymbols } from '../../../lib/logicSystems.js'
import { displayFormulaInput, normalizeFormulaInput } from './formulaHelpers.js'
import { typeKey } from './snapshotUtils.js'

export function buildComboSnapshot(proof, edited, existing, comboTypeKey, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const snapshot = proof[comboTypeKey] || proof.snapshot || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? snapshot.prompt ?? proof.description ?? ''
  const typeVal = comboTypeKey === 'comboTranslationTruthTable' ? 'combo-translation-truth-table' : 'combo-translation-derivation'
  const patch = { [typeKey(e)]: typeVal, prompt }
  if (comboTypeKey === 'comboTranslationTruthTable') {
    const raw = edited.argumentLine ?? edited.answer
    const answer =
      raw != null && raw !== ''
        ? typeof raw === 'string'
          ? { argument: normalizeFormulaInput(raw, logicSystem) }
          : raw
        : proof.answer ?? snapshot.answer
    if (answer != null) patch.answer = answer
  }
  return patch
}

export function ComboPromptEditorForm({ proof, value, onChange, label = 'Prompt' }) {
  const snapshot = proof?.comboTranslationTruthTable || proof?.comboTranslationDerivation || proof?.snapshot || {}
  const prompt = value.prompt ?? snapshot.prompt ?? proof?.description ?? ''
  return (
    <TextField label={label} multiline minRows={2} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
  )
}

export function ComboTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const snapshot = proof?.comboTranslationTruthTable || proof?.snapshot || {}
  const symbols = getSymbols(logicSystem)
  const prompt = value.prompt ?? snapshot.prompt ?? proof?.description ?? ''
  const answerObj = proof?.answer ?? snapshot?.answer
  const argumentLine =
    value.argumentLine ??
    (typeof answerObj === 'string' ? answerObj : answerObj?.argumentLine ?? answerObj?.argument ?? '')
  return (
    <Stack spacing={2}>
      <TextField label="Prompt" multiline minRows={2} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <TextField
        label="Expected argument"
        value={argumentLine}
        onChange={(e) => onChange({ ...value, argumentLine: displayFormulaInput(e.target.value, logicSystem) })}
        fullWidth
        variant="outlined"
        placeholder={`P ${symbols.conditional} Q / P // Q`}
      />
    </Stack>
  )
}
