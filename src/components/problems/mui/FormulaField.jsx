import { forwardRef } from 'react'
import { TextField } from '@mui/material'

// shared formula field for symbolic inputs
const FormulaField = forwardRef(function FormulaField({
  value,
  onValueChange,
  readOnly = false,
  onEnterKey,
  placeholder = '',
  sx,
}, ref) {
  return (
    <TextField
      fullWidth
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && onEnterKey) {
          event.preventDefault()
          onEnterKey()
        }
      }}
      placeholder={placeholder}
      inputRef={ref}
      InputProps={{ readOnly }}
      inputProps={{
        autoComplete: 'off',
        spellCheck: false,
      }}
      sx={{
        '& .MuiInputBase-input': {
          fontFamily: 'monospace',
          fontSize: '1rem',
        },
        ...sx,
      }}
    />
  )
})

export default FormulaField
