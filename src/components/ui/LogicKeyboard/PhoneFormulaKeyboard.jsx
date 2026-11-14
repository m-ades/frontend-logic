import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Slide, Stack, useMediaQuery } from '@mui/material'
import { alpha } from '@mui/material/styles'
import BackspaceOutlined from '@mui/icons-material/BackspaceOutlined'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import FirstPage from '@mui/icons-material/FirstPage'
import LastPage from '@mui/icons-material/LastPage'
import SymbolButtonRow from '../logic-engine/SymbolButtonRow.jsx'
import { mobileKeyGridSx, mobileKeyWellSx } from '../logic-engine/mobileKeyStyles.js'
import PhoneKey from './PhoneKey.jsx'
import { getVariableLettersOnly } from '../../problems/mui/translation/symbolizationKeyboard.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'
import { getNotation } from '../../../lib/logicSystems.js'

const panelSx = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1300,
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: '100vw',
  px: 1,
  pt: 0.75,
  pb: 'max(10px, env(safe-area-inset-bottom, 0px))',
  bgcolor: 'transparent',
  backgroundImage: (t) =>
    t.palette.mode === 'dark'
      ? `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.22)} 0%, ${alpha(t.palette.background.paper, 0.96)} 34%, ${t.palette.background.default} 100%)`
      : `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.14)} 0%, ${t.palette.grey[100]} 32%, ${t.palette.grey[300]} 100%)`,
  borderTop: '1px solid',
  borderColor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.28 : 0.18),
  boxShadow: (t) =>
    t.palette.mode === 'dark'
      ? '0 -12px 32px rgba(0,0,0,0.45)'
      : '0 -10px 28px rgba(83, 109, 254, 0.12), 0 -4px 12px rgba(15, 23, 42, 0.08)',
  overflow: 'hidden',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 18,
    pointerEvents: 'none',
    background: (t) =>
      t.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)',
  },
}

/*
the logic keypad that slides up while a formula field on a phone has focus
every key edits the field through its input like handle, so it types exactly like the desktop keyboard
*/
export default function PhoneFormulaKeyboard({
  open,
  inputRef,
  anchorRef,
  disabled,
  symbolizationKey,
  includeQuantifiers = true,
  extraInsertButtons,
  predicateLetters,
  constantLetters,
  variableLetters,
  logicSystem,
}) {
  const notation = getNotation(logicSystem)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [panel, setPanel] = useState(null)
  const usePredicateLayout = Array.isArray(predicateLetters) && Array.isArray(constantLetters) && Array.isArray(variableLetters)
  const keyLetters = useMemo(() => getVariableLettersOnly(symbolizationKey), [symbolizationKey])
  const field = () => inputRef?.current

  // pads the page by the panel's height and centres the field in what is left
  useEffect(() => {
    if (!open) return undefined
    const pad = panel?.offsetHeight || 220
    const previousPad = document.body.style.paddingBottom
    document.body.style.paddingBottom = `${pad}px`
    const id = window.setTimeout(() => {
      const anchor = anchorRef?.current
      if (!anchor) return
      const visibleHeight = window.visualViewport?.height || window.innerHeight
      const rect = anchor.getBoundingClientRect()
      window.scrollBy({ top: rect.top + rect.height / 2 - (visibleHeight - pad) / 2, behavior: 'smooth' })
    }, 60)
    return () => {
      window.clearTimeout(id)
      document.body.style.paddingBottom = previousPad
    }
  }, [anchorRef, open, panel])

  if (typeof document === 'undefined') return null

  const letterRow = (letters, kind) => (
    <Box sx={mobileKeyGridSx(Math.min(Math.max(letters.length, 1), 6))}>
      {letters.map((letter) => {
        const shown = displayIndexedSymbolsForNotation(letter, notation)
        return (
          <PhoneKey
            key={`${kind}-${letter}`}
            kind={kind}
            label={kind === 'letter' ? `Insert ${shown}` : `Insert ${kind} ${shown}`}
            disabled={disabled}
            onClick={() => field()?.setRangeText(letter)}
          >
            {shown}
          </PhoneKey>
        )
      })}
    </Box>
  )

  return createPortal(
    <Slide direction="up" in={open} mountOnEnter unmountOnExit timeout={reduceMotion ? 0 : undefined}>
      <Box
        ref={setPanel}
        onMouseDown={(e) => e.preventDefault()}
        role="region"
        aria-label="Logic keyboard"
        sx={panelSx}
      >
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            bgcolor: 'text.disabled',
            opacity: 0.45,
            mx: 'auto',
            mb: 0.85,
            '@media (max-height: 480px)': { mb: 0.4 },
            position: 'relative',
          }}
        />
        <Stack
          spacing={1}
          useFlexGap
          sx={{
            width: '100%',
            position: 'relative',
            // tighter stacking when the phone is sideways
            '@media (max-height: 480px)': { gap: 0.5 },
          }}
        >
          <Box role="group" aria-label="Connectives and grouping" sx={mobileKeyWellSx('operators')}>
            <SymbolButtonRow
              inputRef={inputRef}
              disabled={disabled}
              includeQuantifiers={includeQuantifiers}
              showBackspace={false}
              extraInsertButtons={extraInsertButtons}
              centerButtons
              logicSystem={logicSystem}
            />
          </Box>

          {usePredicateLayout ? (
            <Box role="group" aria-label="Predicates, constants, and variables" sx={mobileKeyWellSx('letters')}>
              <Stack spacing={0.5}>
                {predicateLetters.length > 0 && letterRow(predicateLetters, 'predicate')}
                {constantLetters.length > 0 && letterRow(constantLetters, 'constant')}
                {variableLetters.length > 0 && letterRow(variableLetters, 'variable')}
              </Stack>
            </Box>
          ) : (
            <Box role="group" aria-label="Letters" sx={mobileKeyWellSx('letters')}>
              {letterRow(keyLetters, 'letter')}
            </Box>
          )}

          <Box role="group" aria-label="Cursor and backspace" sx={mobileKeyWellSx('nav')}>
            <Box sx={mobileKeyGridSx(5)}>
              <PhoneKey kind="nav" label="Move cursor to start" onClick={() => field()?.moveCaret('start')} disabled={disabled}>
                <FirstPage fontSize="small" />
              </PhoneKey>
              <PhoneKey kind="nav" label="Move cursor left" onClick={() => field()?.moveCaret(-1)} disabled={disabled}>
                <ChevronLeft fontSize="small" />
              </PhoneKey>
              <PhoneKey kind="nav" label="Move cursor right" onClick={() => field()?.moveCaret(1)} disabled={disabled}>
                <ChevronRight fontSize="small" />
              </PhoneKey>
              <PhoneKey kind="nav" label="Move cursor to end" onClick={() => field()?.moveCaret('end')} disabled={disabled}>
                <LastPage fontSize="small" />
              </PhoneKey>
              <PhoneKey kind="backspace" label="Backspace" onClick={() => field()?.deleteBackward()} disabled={disabled}>
                <BackspaceOutlined fontSize="small" />
              </PhoneKey>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Slide>,
    document.body,
  )
}
