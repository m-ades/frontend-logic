import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

// Emits zero-based range drafts; the question save path owns final validation.
export default function AssumptionScopesEditor({
  scopes,
  lines,
  premiseCount,
  onChange,
}) {
  const values = Array.isArray(scopes) ? scopes : []
  const lastScopeLine = lines.length - 2
  const incomplete = values.some(({ start, end }) => (
    !Number.isInteger(start) || !Number.isInteger(end)
  ))
  const update = (scopeIndex, changes) => {
    onChange(values.map((scope, index) => {
      if (index !== scopeIndex) return scope
      const next = { ...scope, ...changes }
      if (Number.isInteger(next.start)
        && (!Number.isInteger(next.end) || next.end < next.start)) {
        next.end = next.start
      }
      return next
    }))
  }
  const lineLabel = (index) => (
    `${premiseCount + index + 1}. ${String(lines[index] ?? '').trim() || 'Blank line'}`
  )

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Assumption scopes</Typography>
      {values.map((scope, scopeIndex) => (
        <Stack key={scopeIndex} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <TextField
            select
            size="small"
            label="Assumption line"
            value={scope.start}
            onChange={(event) => update(scopeIndex, { start: Number(event.target.value) })}
            fullWidth
          >
            <MenuItem value="" disabled>Choose a line</MenuItem>
            {lines.map((_, index) => index <= lastScopeLine && (
              <MenuItem key={index} value={index}>{lineLabel(index)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Scope through"
            value={scope.end}
            onChange={(event) => update(scopeIndex, { end: Number(event.target.value) })}
            fullWidth
            disabled={!Number.isInteger(scope.start)}
          >
            <MenuItem value="" disabled>Choose a line</MenuItem>
            {lines.map((_, index) => Number.isInteger(scope.start)
              && index >= scope.start
              && index <= lastScopeLine && (
              <MenuItem key={index} value={index}>{lineLabel(index)}</MenuItem>
            ))}
          </TextField>
          <IconButton
            size="small"
            onClick={() => onChange(values.filter((_, index) => index !== scopeIndex))}
            aria-label={`Remove assumption scope ${scopeIndex + 1}`}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => onChange([...values, { start: '', end: '' }])}
        disabled={incomplete || lastScopeLine < 0 || values.length > lastScopeLine}
      >
        Add assumption scope
      </Button>
    </Box>
  )
}
