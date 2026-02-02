import { Alert } from '@mui/material'

// status banner for all question types. filled variant, severity from status.
function getSeverity(status) {
  switch (status) {
    case 'correct':
      return 'success'
    case 'incorrect':
      return 'error'
    case 'partial':
      return 'warning'
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
  if (status === 'partial') return 'Partially correct.'
  return ''
}

// statuses that show the banner
export function isTerminalStatus(status) {
  return (
    status === 'correct' ||
    status === 'incorrect' ||
    status === 'partial' ||
    status === 'malfunction'
  )
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
