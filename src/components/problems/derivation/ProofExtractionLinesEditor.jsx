import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

const EMPTY_LINE = ''

export default function ProofExtractionLinesEditor({
  lines,
  justifications,
  assumptionScopes,
  premiseCount,
  formatFormula,
  showAssumptionScopes,
  onChange,
}) {
  const list = Array.isArray(lines) && lines.length ? lines : [EMPTY_LINE]
  const citations = list.map((_, index) => String(justifications?.[index] ?? ''))
  const scopes = Array.isArray(assumptionScopes) ? assumptionScopes : []
  const scopeStarts = new Set(scopes
    .map(({ start }) => start)
    .filter(Number.isInteger))
  const hasIncompleteScope = scopes.some(({ start, end }) => (
    !Number.isInteger(start) || !Number.isInteger(end)
  ))
  const emit = (nextLines, nextCitations = citations, nextScopes = scopes) => {
    onChange({
      lines: nextLines,
      justifications: nextLines.map((_, index) => nextCitations[index] ?? ''),
      assumptionScopes: nextScopes,
    })
  }
  const updateLine = (index, formula) => {
    const next = [...list]
    next[index] = formatFormula(formula)
    emit(next)
  }
  const updateCitation = (index, citation) => {
    const next = [...citations]
    next[index] = citation
    emit(list, next)
  }
  const removeLine = (index) => {
    const nextLines = list.filter((_, itemIndex) => itemIndex !== index)
    const nextCitations = citations.filter((_, itemIndex) => itemIndex !== index)
    const nextScopes = scopes.flatMap((scope) => {
      if (!Number.isInteger(scope.start) || !Number.isInteger(scope.end)) return [scope]
      if (scope.start === index) return []
      if (index < scope.start) {
        return [{ start: scope.start - 1, end: scope.end - 1 }]
      }
      if (index <= scope.end) {
        return [{ ...scope, end: scope.end - 1 }]
      }
      return [scope]
    })
    emit(nextLines, nextCitations, nextScopes)
  }
  const updateScope = (scopeIndex, updates) => {
    const next = scopes.map((scope, index) => {
      if (index !== scopeIndex) return scope
      const updated = { ...scope, ...updates }
      if (Number.isInteger(updated.start)
        && (!Number.isInteger(updated.end) || updated.end < updated.start)) {
        updated.end = updated.start
      }
      return updated
    })
    emit(list, citations, next)
  }
  const addScope = () => {
    emit(list, citations, [...scopes, { start: '', end: '' }])
  }
  const lineLabel = (index) => {
    const formula = String(list[index] ?? '').trim()
    return `${premiseCount + index + 1}. ${formula || 'Blank line'}`
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Lines after the premises</Typography>
      {list.map((formula, index) => {
        const startsScope = scopeStarts.has(index)
        const suppliedRule = citations[index].trim().toUpperCase()
        const invalidSuppliedRule = startsScope && suppliedRule && suppliedRule !== 'AS'
        return (
          <Stack
            key={index}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={1}
            sx={{ mb: 1 }}
          >
            <TextField
              size="small"
              value={formula}
              onChange={(event) => updateLine(index, event.target.value)}
              fullWidth
              placeholder={`Line ${index + 1}`}
            />
            <TextField
              size="small"
              value={citations[index]}
              onChange={(event) => updateCitation(index, event.target.value)}
              fullWidth
              label="Provided justification"
              placeholder="Leave blank for the student"
              error={Boolean(invalidSuppliedRule)}
              helperText={startsScope
                ? 'This assumption line requires AS; leave it blank for the student.'
                : undefined}
            />
            <IconButton
              size="small"
              onClick={() => removeLine(index)}
              aria-label={`Remove line ${index + 1}`}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>
        )
      })}

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => emit([...list, EMPTY_LINE], [...citations, ''])}
      >
        Add line
      </Button>

      {showAssumptionScopes && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Assumption scopes</Typography>
          {scopes.map((scope, scopeIndex) => (
            <Stack key={scopeIndex} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <TextField
                select
                size="small"
                label="Assumption line"
                value={scope.start}
                onChange={(event) => updateScope(scopeIndex, { start: Number(event.target.value) })}
                fullWidth
              >
                <MenuItem value="" disabled>Choose a line</MenuItem>
                {list.map((_, index) => (
                  <MenuItem key={index} value={index}>{lineLabel(index)}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Scope through"
                value={scope.end}
                onChange={(event) => updateScope(scopeIndex, { end: Number(event.target.value) })}
                fullWidth
                disabled={!Number.isInteger(scope.start)}
              >
                <MenuItem value="" disabled>Choose a line</MenuItem>
                {list.map((_, index) => Number.isInteger(scope.start) && index >= scope.start && (
                  <MenuItem key={index} value={index}>{lineLabel(index)}</MenuItem>
                ))}
              </TextField>
              <IconButton
                size="small"
                onClick={() => emit(
                  list,
                  citations,
                  scopes.filter((_, index) => index !== scopeIndex)
                )}
                aria-label={`Remove assumption scope ${scopeIndex + 1}`}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addScope}
            disabled={hasIncompleteScope || scopeStarts.size >= list.length}
          >
            Add assumption scope
          </Button>
        </Box>
      )}
    </Box>
  )
}
