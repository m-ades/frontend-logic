import * as React from 'react'
import { Stack, TextField } from '@mui/material'
import { DEFAULT_LOGIC_SYSTEM } from '../../../lib/logicSystems.js'
import { normalizeArgumentInput } from './formulaHelpers.js'
import { typeKey } from './snapshotUtils.js'
import { IndirectTruthTableEditorForm } from './IndirectTruthTableEditor.jsx'

export function buildNonClassicalTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const nctt = proof.nonclassicalTruthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? nctt.prompt ?? proof.description ?? ''
  const normalizedArgument = normalizeArgumentInput(
    (edited.argument && typeof edited.argument === 'object') ? edited.argument : {},
    logicSystem
  )
  const questions = Array.isArray(edited.questions) ? edited.questions : (nctt.questions || nctt.subquestions || [])
  const truthValueToggle = Array.isArray(edited.truthValueToggle)
    ? edited.truthValueToggle
    : (Array.isArray(nctt.truthValueToggle) ? nctt.truthValueToggle : undefined)
  const patch = { [typeKey(e)]: 'nonclassical-truth-table', prompt, argument: normalizedArgument, questions }
  if (edited.partialCredit !== undefined) {
    patch.partialCredit = edited.partialCredit
  }
  if (truthValueToggle) {
    patch.truthValueToggle = truthValueToggle
  }
  if (e.subquestions !== undefined) patch.subquestions = questions
  return patch
}

export function NonClassicalTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const rawToggle = value.truthValueToggle ?? proof?.nonclassicalTruthTable?.truthValueToggle ?? ['T', 'F', 'N']
  const toggleText = Array.isArray(rawToggle) ? rawToggle.join(',') : String(rawToggle || '')

  const updateToggle = (text) => {
    const next = text
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    onChange({ ...value, truthValueToggle: next })
  }

  return (
    <Stack spacing={2}>
      <TextField
        label="Truth value cycle"
        value={toggleText}
        onChange={(e) => updateToggle(e.target.value)}
        fullWidth
        helperText="Comma-separated values (e.g., T, F, N or T, F, B or T, F, N, B)."
      />
      <IndirectTruthTableEditorForm proof={proof} value={value} onChange={onChange} logicSystem={logicSystem} />
    </Stack>
  )
}
