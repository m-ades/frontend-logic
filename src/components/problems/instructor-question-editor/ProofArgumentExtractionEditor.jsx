import * as React from 'react'
import { Stack, TextField } from '@mui/material'
import { DEFAULT_LOGIC_SYSTEM } from '../../../lib/logicSystems.js'
import { rebaseProofJustifications } from '../../../lib/proofArgumentExtractionEdits.js'
import AssumptionScopesEditor from '../derivation/AssumptionScopesEditor.jsx'
import { normalizeJustificationForDisplay } from '../derivation/derivationUtils.js'
import { displayFormulaInput, normalizeFormulaInputs } from './formulaHelpers.js'
import { FormulaListEditor } from './FormulaListEditor.jsx'
import { typeKey } from './snapshotUtils.js'

export function buildProofArgumentExtractionSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const snapshot = proof.questionSnapshot || proof.snapshot || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const lines = normalizeFormulaInputs(edited.lines ?? proof.lines ?? snapshot.lines ?? [], logicSystem)
  const justificationInput = edited.justifications
    ?? proof.justifications
    ?? snapshot.justifications
    ?? []
  const justifications = Array.isArray(justificationInput) ? justificationInput : []
  return {
    [typeKey(e)]: 'proof-argument-extraction',
    prompt: edited.prompt ?? snapshot.prompt ?? proof.description ?? '',
    prems: normalizeFormulaInputs(edited.premises ?? proof.premises ?? snapshot.prems ?? [], logicSystem),
    lines,
    justifications: lines.map((_, index) => String(justifications[index] ?? '').trim()),
    assumptionScopes: edited.assumptionScopes
      ?? proof.assumptionScopes
      ?? snapshot.assumptionScopes
      ?? [],
  }
}

export function ProofArgumentExtractionEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const snapshot = proof?.questionSnapshot || proof?.snapshot || {}
  const premises = value.premises ?? proof?.premises ?? snapshot.prems ?? []
  const lines = value.lines ?? proof?.lines ?? snapshot.lines ?? []
  const justifications = value.justifications
    ?? proof?.justifications
    ?? snapshot.justifications
    ?? []
  const assumptionScopes = value.assumptionScopes
    ?? proof?.assumptionScopes
    ?? snapshot.assumptionScopes
    ?? []
  const update = (updates) => onChange({ ...value, ...updates })
  const updateLines = (nextLines, nextJustifications, removedIndex) => {
    const displayedJustifications = nextJustifications.map(normalizeJustificationForDisplay)
    const nextScopes = removedIndex == null ? assumptionScopes : assumptionScopes.flatMap((scope) => {
      if (!Number.isInteger(scope.start) || !Number.isInteger(scope.end)) return [scope]
      if (scope.start === removedIndex) return []
      if (removedIndex < scope.start) {
        return [{ start: scope.start - 1, end: scope.end - 1 }]
      }
      if (removedIndex <= scope.end) return [{ ...scope, end: scope.end - 1 }]
      return [scope]
    })
    update({
      lines: nextLines.map((formula) => displayFormulaInput(formula, logicSystem)),
      justifications: removedIndex == null
        ? displayedJustifications
        : rebaseProofJustifications(displayedJustifications, {
            lineNumber: premises.length + removedIndex + 1,
            operation: 'remove',
            rulesFirst: logicSystem !== 'hurley',
          }),
      assumptionScopes: nextScopes,
    })
  }
  const updatePremises = (nextPremises, _nextSecondary, removedIndex) => {
    let nextJustifications = justifications
    if (removedIndex != null && nextPremises.length < premises.length) {
      nextJustifications = rebaseProofJustifications(justifications, {
        lineNumber: removedIndex + 1,
        operation: 'remove',
        rulesFirst: logicSystem !== 'hurley',
      })
    } else if (nextPremises.length > premises.length) {
      nextJustifications = rebaseProofJustifications(justifications, {
        lineNumber: premises.length + 1,
        operation: 'insert',
        rulesFirst: logicSystem !== 'hurley',
      })
    }
    update({
      premises: nextPremises.map((formula) => displayFormulaInput(formula, logicSystem)),
      justifications: nextJustifications,
    })
  }
  return (
    <Stack spacing={2}>
      <TextField
        label="Prompt"
        multiline
        minRows={2}
        value={value.prompt ?? snapshot.prompt ?? proof?.description ?? ''}
        onChange={(event) => update({ prompt: event.target.value })}
        fullWidth
      />
      <FormulaListEditor
        label="Premises"
        values={premises}
        onChange={updatePremises}
        placeholder="Premise"
      />
      <FormulaListEditor
        label="Lines after the premises"
        values={lines}
        secondaryValues={justifications}
        onChange={updateLines}
        placeholder="Line"
        secondaryLabel="Provided justification"
        secondaryPlaceholder="Leave blank for the student"
      />
      <AssumptionScopesEditor
        scopes={assumptionScopes}
        lines={lines}
        premiseCount={premises.length}
        onChange={(next) => update({ assumptionScopes: next })}
      />
    </Stack>
  )
}
