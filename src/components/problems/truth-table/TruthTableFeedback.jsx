// renders live table guidance and validation directly beneath the grid
// state controls copy color and icon

import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { Stack, Typography } from '@mui/material'

const FEEDBACK = {
  incomplete: {
    color: 'text.secondary',
    icon: null,
    message: 'Fill every blank cell.',
  },
  incorrect: {
    color: 'error.main',
    icon: CloseIcon,
    message: 'Recheck your rows.',
  },
  complete: {
    color: 'success.main',
    icon: CheckIcon,
    message: 'Truth table looks good.',
  },
}

export default function TruthTableFeedback({ state }) {
  const feedback = FEEDBACK[state] ?? FEEDBACK.incomplete
  const Icon = feedback.icon

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      role="status"
      aria-live="polite"
      sx={{ color: feedback.color, minHeight: 20 }}
    >
      {Icon && <Icon aria-hidden="true" sx={{ fontSize: 16 }} />}
      <Typography variant="body2" sx={{ m: 0, color: 'inherit', fontWeight: 500 }}>
        {feedback.message}
      </Typography>
    </Stack>
  )
}
