import { forwardRef } from 'react'
import { TextField, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MobileLogicInput from '../../../ui/LogicKeyboard/MobileLogicInput.jsx'

// shared formula field for symbolic inputs
const FormulaField = forwardRef(function FormulaField({
  value,
  onValueChange,
  readOnly = false,
  onEnterKey,
  placeholder = '',
  symbolizationKey,
  includeQuantifiers = true,
  extraInsertButtons,
  predicateLetters,
  constantLetters,
  variableLetters,
  logicSystem,
  sx,
}, ref) {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))

  if (isPhone) {
    // on phones route back through the existing custom keyboard path
    return (
      <MobileLogicInput
        value={value}
        onChange={(nextValue) => onValueChange?.(nextValue)}
        disabled={readOnly}
        placeholder={placeholder}
        aria-label={placeholder || 'Formula input'}
        symbolizationKey={symbolizationKey}
        includeQuantifiers={includeQuantifiers}
        extraInsertButtons={extraInsertButtons}
        onEnterKey={onEnterKey}
        predicateLetters={predicateLetters}
        constantLetters={constantLetters}
        variableLetters={variableLetters}
        logicSystem={logicSystem}
      />
    )
  }

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
