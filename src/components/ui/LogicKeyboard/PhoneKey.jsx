import { Button } from '@mui/material'
import { getMobileKeySx } from '../logic-engine/mobileKeyStyles.js'

// one key on a phone keypad, whose panel keeps focus in the field on press
export default function PhoneKey({ label, onClick, disabled, kind = 'letter', children }) {
  return (
    <Button
      type="button"
      variant="text"
      disableRipple
      disableElevation
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      sx={getMobileKeySx(kind)}
    >
      {children}
    </Button>
  )
}
