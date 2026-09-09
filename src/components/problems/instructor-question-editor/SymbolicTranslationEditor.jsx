import * as React from 'react'
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { DEFAULT_LOGIC_SYSTEM, getNotation, getSymbols } from '../../../lib/logicSystems.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'
import { displayTranslationAnswerInput, normalizeTranslationAnswerInput } from './formulaHelpers.js'
import { typeKey } from './snapshotUtils.js'

export function buildSymbolicTranslationSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const tr = proof.translation || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? tr.prompt ?? proof.description ?? ''
  const rawKey = Array.isArray(edited.symbolizationKey) ? edited.symbolizationKey : (tr.symbolizationKey || [])
  const symbolizationKey = rawKey.filter((x) => x != null && String(x).trim() !== '')
  const answer = normalizeTranslationAnswerInput(edited.answer ?? proof.answer ?? tr.answer ?? '', logicSystem)
  const patch = { [typeKey(e)]: 'symbolic-translation', prompt, symbolizationKey, answer }
  patch.sentence = edited.sentence ?? tr.sentence ?? ''
  const legacyLegend = edited.legend ?? tr.legend ?? proof.legend ?? e.legend ?? ''
  if (symbolizationKey.length === 0 && legacyLegend) patch.legend = legacyLegend
  return patch
}

export function SymbolicTranslationEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const tr = proof?.translation || {}
  const symbols = getSymbols(logicSystem)
  const prompt = value.prompt ?? tr.prompt ?? proof?.description ?? ''
  const sentence = value.sentence ?? tr.sentence ?? ''
  const symbolizationKey = Array.isArray(value.symbolizationKey) ? value.symbolizationKey : (tr.symbolizationKey || [])
  const answer = value.answer ?? proof?.answer ?? tr?.answer ?? proof?.solution ?? ''
  const keyList = Array.isArray(symbolizationKey) && symbolizationKey.length > 0 ? symbolizationKey : ['']
  const updateKey = (idx, str) => {
    const next = [...keyList]
    next[idx] = displayIndexedSymbolsForNotation(str, getNotation(logicSystem))
    onChange({ ...value, symbolizationKey: next.filter(Boolean) })
  }
  return (
    <Stack spacing={2}>
      <TextField label="Prompt / instructions" multiline minRows={2} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <TextField label="Sentence" multiline minRows={2} value={sentence} onChange={(e) => onChange({ ...value, sentence: e.target.value })} fullWidth variant="outlined" placeholder="e.g. The zoo has lions or tigers and bears." helperText="The sentence to symbolize, rendered separately from the prompt." />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Symbolization key</Typography>
        {keyList.map((entry, idx) => (
          <Stack key={idx} direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField size="small" value={typeof entry === 'string' ? entry : (entry?.symbol && entry?.meaning ? `${entry.symbol}: ${entry.meaning}` : '')} onChange={(e) => updateKey(idx, e.target.value)} fullWidth placeholder="P: dogs" />
            <IconButton size="small" onClick={() => onChange({ ...value, symbolizationKey: keyList.filter((_, i) => i !== idx) })}><DeleteOutlineIcon /></IconButton>
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ ...value, symbolizationKey: [...keyList, ''] })}>Add line</Button>
      </Box>
      <TextField label="Correct answer" value={answer} onChange={(e) => onChange({ ...value, answer: displayTranslationAnswerInput(e.target.value, logicSystem) })} fullWidth variant="outlined" placeholder={getNotation(logicSystem) === 'calgary' ? 'e.g. P, Q ∴ R' : `e.g. P / Q // ${symbols.not}R`} />
    </Stack>
  )
}
