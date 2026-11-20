import { Button } from '@mui/material'
import { getMobileKeySx } from '../logic-engine/mobileKeyStyles.js'

// ringed to mark the current choice on a keypad that picks a value
const selectedKeySx = {
  boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`,
  fontWeight: 800,
}

// one key on a phone keypad, whose panel keeps focus in the field on press
export default function PhoneKey({ label, onClick, disabled, kind = 'letter', selected = false, children }) {
  return (
    <Button
      type="button"
      variant="text"
      disableRipple
      disableElevation
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected || undefined}
      sx={[...getMobileKeySx(kind), selected && selectedKeySx]}
    >
      {children}
    </Button>
  )
}
