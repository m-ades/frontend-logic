import * as React from 'react'
import { Stack, TextField } from '@mui/material'
import { DEFAULT_LOGIC_SYSTEM, normalizeLogicSystem } from '../../../lib/logicSystems.js'
import { displayFormulaInput, normalizeFormulaInput, normalizeFormulaInputs } from './formulaHelpers.js'
import { FormulaListEditor } from './FormulaListEditor.jsx'
import { typeKey } from './snapshotUtils.js'
import { buildRulesetPatch } from './ruleHelpers.js'
import { DerivationRulesetFields } from './DerivationRulesetFields.jsx'

export function buildDerivationSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const e = existing && typeof existing === 'object' ? existing : {}
  const key = typeKey(e)
  const savedType = e[key] === 'derivation-hurley' ? 'derivation-hurley' : 'derivation'
  const activeLogicSystem = savedType === 'derivation-hurley'
    ? 'hurley'
    : normalizeLogicSystem(logicSystem, DEFAULT_LOGIC_SYSTEM)
  const prems = normalizeFormulaInputs(edited.premises ?? proof.premises ?? proof.prems ?? [], activeLogicSystem)
  const conclusion = normalizeFormulaInput(edited.conclusion ?? proof.conclusion ?? proof.conc ?? '', activeLogicSystem)
  const prompt = edited.prompt ?? proof.description ?? ''
  // new derivations stay generic and the course chooses the system
  // old hurley snapshots keep their mark
  return {
    [key]: savedType,
    prompt,
    prems,
    conc: conclusion,
    ruleset: buildRulesetPatch(edited.ruleset ?? proof.ruleset ?? proof.ruleSet ?? e.ruleset, activeLogicSystem),
  }
}

export function DerivationEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const premises = value.premises ?? proof.premises ?? proof.prems ?? []
  const conclusion = value.conclusion ?? proof.conclusion ?? proof.conc ?? ''
  const prompt = value.prompt ?? proof.description ?? ''
  const ruleset = value.ruleset ?? proof.ruleset ?? proof.ruleSet

  const update = (updates) => onChange({ ...value, ...updates })
  const premsList = Array.isArray(premises) ? premises : (premises ? [premises] : [])
  const activeLogicSystem = proof?.type === 'derivation-hurley'
    ? 'hurley'
    : normalizeLogicSystem(logicSystem, DEFAULT_LOGIC_SYSTEM)
  return (
    <Stack spacing={2}>
      <TextField
        label="Prompt"
        multiline
        minRows={1}
        value={prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        fullWidth
        variant="outlined"
      />
      <FormulaListEditor
        label="Premises"
        values={premsList}
        onChange={(next) => update({
          premises: next.map((formula) => displayFormulaInput(formula, activeLogicSystem)),
        })}
        placeholder="Premise"
      />
      <TextField
        label="Conclusion"
        value={conclusion}
        onChange={(e) => update({ conclusion: displayFormulaInput(e.target.value, activeLogicSystem) })}
        fullWidth
        variant="outlined"
      />
      <DerivationRulesetFields
        ruleset={ruleset}
        logicSystem={activeLogicSystem}
        onChange={(next) => update({ ruleset: next })}
      />
    </Stack>
  )
}
