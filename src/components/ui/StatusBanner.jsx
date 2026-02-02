import { Alert } from '@mui/material'

/**
 * Shared status banner for all question types. Uses MUI Alert with a consistent
 * look: variant="filled", same severity mapping, and default messages for correct/incorrect.
 */
function getSeverity(status) {
  switch (status) {
    case 'correct':
      return 'success'
    case 'incorrect':
      return 'error'
    case 'malfunction':
      return 'warning'
    case 'checking':
      return 'info'
    default:
      return 'info'
  }
}

function getDefaultMessage(status) {
  if (status === 'correct') return 'Correct!'
  if (status === 'incorrect') return 'Incorrect.'
  return ''
}

export default function StatusBanner({ status, message, onClose, sx }) {
  const displayMessage = message || getDefaultMessage(status)
  const severity = getSeverity(status)

  return (
    <Alert
      severity={severity}
      variant="filled"
      onClose={onClose}
      sx={sx}
    >
      {displayMessage}
    </Alert>
  )
}

export { getSeverity }
