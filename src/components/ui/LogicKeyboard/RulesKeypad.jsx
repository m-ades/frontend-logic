import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, useMediaQuery } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { mobileKeyGridSx, mobileKeyWellSx } from '../logic-engine/mobileKeyStyles.js'
import PhoneKey from './PhoneKey.jsx'
import useKeyboardClearance from './useKeyboardClearance.js'
import { groupDerivationRules, isSameDerivationRule } from '../../../lib/derivationRules.js'

// the most keys a group puts on one portrait row before it splits over two
const PORTRAIT_ROW_KEYS = 8
// the width a key asks for, so groups that fit share a row and the rest wrap
const KEY_BASIS = 40
const CONTROL_KEYS = 2

// spreads a group evenly over as few rows as it needs, so ten keys sit five and five rather than eight and two
const balancedColumns = (count) => Math.ceil(count / Math.ceil(count / PORTRAIT_ROW_KEYS))

/*
the keypad that picks a line's rule on a phone, in place of the dropdown menu
shows the proof's allowed rules in the families the textbook teaches them in and rings the line's current rule
*/
export default function RulesKeypad({ open, anchorRef, rules, logicSystem, selected, onPick, onClear, onDone }) {
  const [panel, setPanel] = useState(null)
  // a phone on its side has room for every group in a single row
  const landscape = useMediaQuery('(orientation: landscape) and (max-height: 599.95px)')
  useKeyboardClearance({ open, panel, anchorRef })
  if (!open || typeof document === 'undefined') return null

  const groups = groupDerivationRules(rules, logicSystem)
  const rowKeys = landscape ? Infinity : PORTRAIT_ROW_KEYS
  // groups ask for room by key count and wrap onto the next row when the current one is full
  const wellSx = (count, tint) => [
    mobileKeyWellSx(tint),
    { flex: `${count} 1 ${Math.min(count, rowKeys) * KEY_BASIS}px`, minWidth: 0 },
  ]
  const gridSx = (count) => mobileKeyGridSx(count <= rowKeys ? count : balancedColumns(count))

  return createPortal(
    <Box
      ref={setPanel}
      // keep focus on the rule field while a key is pressed
      onMouseDown={(event) => event.preventDefault()}
      role="region"
      aria-label="Rule keyboard"
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, '@media (max-height: 480px)': { gap: 0.5 } }}>
        {groups.map(({ key, label, rules: groupRules }) => (
          <Box key={key} role="group" aria-label={label} sx={wellSx(groupRules.length, 'letters')}>
            <Box sx={gridSx(groupRules.length)}>
              {groupRules.map((rule) => {
                const current = isSameDerivationRule(rule, selected)
                return (
                  <PhoneKey
                    key={rule}
                    label={current ? `Rule ${rule}, current` : `Rule ${rule}`}
                    selected={current}
                    onClick={() => onPick(rule)}
                  >
                    {rule}
                  </PhoneKey>
                )
              })}
            </Box>
          </Box>
        ))}

        <Box role="group" aria-label="Clear and close" sx={wellSx(CONTROL_KEYS, 'nav')}>
          <Box sx={mobileKeyGridSx(CONTROL_KEYS)}>
            <PhoneKey kind="nav" label="Clear rule" disabled={!selected} onClick={onClear}>Clear</PhoneKey>
            <PhoneKey kind="constant" label="Close rule keyboard" onClick={onDone}>Done</PhoneKey>
          </Box>
        </Box>
      </Box>
    </Box>,
    document.body,
  )
}
