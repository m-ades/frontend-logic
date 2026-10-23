import { createPortal } from 'react-dom'
import { Box, Button, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import BackspaceOutlined from '@mui/icons-material/BackspaceOutlined'
import {
  getMobileKeySx,
  mobileKeyGridSx,
  mobileKeyWellSx,
} from '../logic-engine/mobileKeyStyles.js'

/*
digits-only keyboard for line citations on phones.

the citation field only ever takes line numbers, ranges and separators, but it
is a plain text input, so ios offered the full qwerty keyboard and kept flipping
back to letters between digits. this panel replaces it; the field is marked
inputMode="none" by the caller so the native keyboard stays down.

the separators match what justification formatting emits: ', ' between numbers
and an en dash inside a range (the parser also accepts a plain hyphen).
*/

const DIGIT_ROWS = [
  ['1', '2', '3', '4', '5'],
  ['6', '7', '8', '9', '0'],
]

export const CITATION_RANGE_DASH = '–'
export const CITATION_SEPARATOR = ', '

export default function LineCitationKeypad({ open, onInsert, onBackspace, onDone }) {
  if (!open || typeof document === 'undefined') return null

  // keep focus (and the caret) in the citation field while a key is pressed
  const hold = (event) => event.preventDefault()

  const key = (label, ariaLabel, onClick, kind = 'letter', sx) => (
    <Button
      key={label}
      type="button"
      variant="text"
      disableRipple
      disableElevation
      onMouseDown={hold}
      onClick={onClick}
      aria-label={ariaLabel}
      sx={[...getMobileKeySx(kind), ...(sx ? [sx] : [])]}
    >
      {label}
    </Button>
  )

  return createPortal(
    <Box
      onMouseDown={hold}
      role="region"
      aria-label="Line number keyboard"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        boxSizing: 'border-box',
        width: '100%',
        px: 1,
        pt: 0.75,
        pb: 'max(10px, env(safe-area-inset-bottom, 0px))',
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.18),
        boxShadow: (theme) => (
          theme.palette.mode === 'dark'
            ? '0 -12px 32px rgba(0,0,0,0.45)'
            : '0 -10px 28px rgba(83, 109, 254, 0.12)'
        ),
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <Stack spacing={0.75} sx={{ '@media (max-height: 480px)': { gap: 0.5 } }}>
        <Box role="group" aria-label="Digits" sx={mobileKeyWellSx('letters')}>
          <Stack spacing={0.5}>
            {DIGIT_ROWS.map((row) => (
              <Box key={row.join('')} sx={mobileKeyGridSx(5)}>
                {row.map((digit) => key(digit, `Insert ${digit}`, () => onInsert(digit)))}
              </Box>
            ))}
          </Stack>
        </Box>

        <Box role="group" aria-label="Separators and editing" sx={mobileKeyWellSx('nav')}>
          <Box sx={mobileKeyGridSx(4)}>
            {key(',', 'Insert comma separator', () => onInsert(CITATION_SEPARATOR), 'nav')}
            {key(CITATION_RANGE_DASH, 'Insert range dash', () => onInsert(CITATION_RANGE_DASH), 'nav')}
            <Button
              type="button"
              variant="text"
              disableRipple
              disableElevation
              onMouseDown={hold}
              onClick={onBackspace}
              aria-label="Backspace"
              sx={getMobileKeySx('backspace')}
            >
              <BackspaceOutlined fontSize="small" />
            </Button>
            {key('Done', 'Close line number keyboard', onDone, 'constant')}
          </Box>
        </Box>
      </Stack>
    </Box>,
    document.body,
  )
}
