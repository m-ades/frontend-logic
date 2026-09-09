import * as React from 'react'
import { TextField } from '@mui/material'

export function AttemptLimitField({ value, onChange }) {
  const num = value != null && Number.isFinite(Number(value))
    ? Math.max(1, Number(value))
    : 3
  return (
    <TextField
      type="number"
      label="Attempt limit"
      value={num}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10)
        onChange(Number.isFinite(v) && v >= 1 ? v : num)
      }}
      inputProps={{ min: 1, step: 1 }}
      size="small"
      fullWidth
    />
  )
}
