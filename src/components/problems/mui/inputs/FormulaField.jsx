import { forwardRef } from 'react'
import { TextField, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MobileLogicInput from '../../../ui/LogicKeyboard/MobileLogicInput.jsx'
import FormulaInput from '../../../ui/logicpenguin/formula-input.js'
import getSyntax from '../../../../lib/logicpenguin/symbolic/libsyntax.js'
import { getNotation } from '../../../../lib/logicSystems.js'

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
  const notation = getNotation(logicSystem)
  const syntax = getSyntax(notation)

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
        if (readOnly) return
        if (event.key === 'Enter' && onEnterKey) {
          event.preventDefault()
          onEnterKey()
          return
        }
        const input = event.currentTarget
        input.syntax = syntax
        input.notation = notation
        input.symbols = syntax.symbols
        input.inputfix = FormulaInput.formatForDisplay
        input.autoChange = FormulaInput.autoChange
        input.insertHere = FormulaInput.insertHere
        input.insOp = FormulaInput.insOp
        FormulaInput.keydown.call(input, event)
        if (input.value !== value) {
          onValueChange?.(input.value)
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
