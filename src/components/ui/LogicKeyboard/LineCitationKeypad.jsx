import { createPortal } from 'react-dom'
import { Box, Stack } from '@mui/material'
import { alpha } from '@mui/material/styles'
import BackspaceOutlined from '@mui/icons-material/BackspaceOutlined'
import { mobileKeyGridSx, mobileKeyWellSx } from '../logic-engine/mobileKeyStyles.js'
import PhoneKey from './PhoneKey.jsx'

const DIGIT_ROWS = [
  ['1', '2', '3', '4', '5'],
  ['6', '7', '8', '9', '0'],
]

// same separators justification formatting writes
const CITATION_RANGE_DASH = '–'
const CITATION_SEPARATOR = ', '

export default function LineCitationKeypad({ open, inputRef, value, onChange }) {
  if (!open || typeof document === 'undefined') return null

  // keep focus (and the caret) in the citation field while a key is pressed
  const hold = (event) => event.preventDefault()

  const replace = (from, to, text) => {
    const caret = from + text.length
    onChange(value.slice(0, from) + text + value.slice(to))
    // the controlled rerender jumps the caret to the end, so put it back
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(caret, caret))
  }
  const selection = () => {
    const input = inputRef.current
    const start = input?.selectionStart ?? value.length
    return [start, input?.selectionEnd ?? start]
  }
  const insert = (text) => {
    const [start, end] = selection()
    replace(start, end, text)
  }
  const backspace = () => {
    const [start, end] = selection()
    if (start === end && start === 0) return
    replace(start === end ? start - 1 : start, end, '')
  }
  const done = () => inputRef.current?.blur()

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
      <Stack spacing={0.75} useFlexGap sx={{ '@media (max-height: 480px)': { gap: 0.5 } }}>
        <Box role="group" aria-label="Digits" sx={mobileKeyWellSx('letters')}>
          <Stack spacing={0.5}>
            {DIGIT_ROWS.map((row) => (
              <Box key={row.join('')} sx={mobileKeyGridSx(5)}>
                {row.map((digit) => (
                  <PhoneKey key={digit} label={`Insert ${digit}`} onClick={() => insert(digit)}>{digit}</PhoneKey>
                ))}
              </Box>
            ))}
          </Stack>
        </Box>

        <Box role="group" aria-label="Separators and editing" sx={mobileKeyWellSx('nav')}>
          <Box sx={mobileKeyGridSx(4)}>
            <PhoneKey kind="nav" label="Insert comma separator" onClick={() => insert(CITATION_SEPARATOR)}>,</PhoneKey>
            <PhoneKey kind="nav" label="Insert range dash" onClick={() => insert(CITATION_RANGE_DASH)}>
              {CITATION_RANGE_DASH}
            </PhoneKey>
            <PhoneKey kind="backspace" label="Backspace" onClick={backspace}>
              <BackspaceOutlined fontSize="small" />
            </PhoneKey>
            <PhoneKey kind="constant" label="Close line number keyboard" onClick={done}>Done</PhoneKey>
          </Box>
        </Box>
      </Stack>
    </Box>,
    document.body,
  )
}
