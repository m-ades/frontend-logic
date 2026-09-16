import * as React from 'react'
import { TextField } from '@mui/material'

export function AttemptLimitField({ value, onChange }) {
  const committed = value != null && Number.isFinite(Number(value))
    ? Math.max(1, Number(value))
    : 3
  const [draft, setDraft] = React.useState(String(committed))

  React.useEffect(() => {
    setDraft(String(committed))
  }, [committed])

  return (
    <TextField
      type="number"
      label="Attempt limit"
      value={draft}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        const parsed = parseInt(next, 10)
        if (Number.isFinite(parsed) && parsed >= 1) {
          onChange(parsed)
        }
      }}
      onBlur={() => setDraft(String(committed))}
      onWheel={(e) => e.target.blur()}
      inputProps={{ min: 1, step: 1 }}
      size="small"
      fullWidth
    />
  )
}
