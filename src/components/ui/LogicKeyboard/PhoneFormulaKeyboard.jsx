import { useMemo, useState } from 'react'
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
import useKeyboardClearance from './useKeyboardClearance.js'
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
  // an opaque base under the tint so page text behind the panel never shows through it
  bgcolor: 'background.paper',
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

const NAV_KEY_COUNT = 5

// proofs add a quantifier key for each other variable they use, like ∀y or (∃z)
const QUANTIFIER_KEY = /^\(?[∀∃]/

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
  // a phone on its side has width to spare and little height, so the rows fold together
  const landscape = useMediaQuery('(orientation: landscape) and (max-height: 599.95px)')
  const [panel, setPanel] = useState(null)
  const usePredicateLayout = Array.isArray(predicateLetters) && Array.isArray(constantLetters) && Array.isArray(variableLetters)
  const keyLetters = useMemo(() => getVariableLettersOnly(symbolizationKey), [symbolizationKey])
  // with variable keys on the pad a quantifier goes in bare, so one key per quantifier covers every variable
  const bareQuantifiers = usePredicateLayout && variableLetters.length > 0
  const operatorExtras = bareQuantifiers
    ? extraInsertButtons?.filter(({ insert }) => !QUANTIFIER_KEY.test(insert ?? ''))
    : extraInsertButtons
  const letterGroups = usePredicateLayout
    ? [
        { kind: 'predicate', letters: predicateLetters },
        { kind: 'constant', letters: constantLetters },
        { kind: 'variable', letters: variableLetters },
      ].filter(({ letters }) => letters.length > 0)
    : [{ kind: 'letter', letters: keyLetters }]
  const lettersLabel = usePredicateLayout ? 'Predicates, constants, and variables' : 'Letters'
  const field = () => inputRef?.current

  useKeyboardClearance({ open, panel, anchorRef })

  if (typeof document === 'undefined') return null

  const letterKey = (letter, kind) => {
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
  }

  const navWell = (sx) => (
    <Box role="group" aria-label="Cursor and backspace" sx={[mobileKeyWellSx('nav'), sx]}>
      <Box sx={mobileKeyGridSx(NAV_KEY_COUNT)}>
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
  )

  const letterCount = letterGroups.reduce((sum, { letters }) => sum + letters.length, 0)

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
            display: landscape ? 'none' : 'block',
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
              bareQuantifiers={bareQuantifiers}
              extraInsertButtons={operatorExtras}
              centerButtons
              logicSystem={logicSystem}
            />
          </Box>

          {landscape ? (
            // every letter on one line with the cursor keys beside it; each kind keeps its colour and shape
            <Box sx={{ display: 'flex', gap: 0.5, width: '100%' }}>
              <Box
                role="group"
                aria-label={lettersLabel}
                sx={[mobileKeyWellSx('letters'), { flex: Math.max(letterCount, 1), minWidth: 0 }]}
              >
                <Box sx={[mobileKeyGridSx(letterCount), { gridTemplateColumns: 'repeat(auto-fit, minmax(32px, 1fr))' }]}>
                  {letterGroups.flatMap(({ kind, letters }) => letters.map((letter) => letterKey(letter, kind)))}
                </Box>
              </Box>
              {navWell({ flex: NAV_KEY_COUNT, minWidth: 0 })}
            </Box>
          ) : (
            <>
              <Box role="group" aria-label={lettersLabel} sx={mobileKeyWellSx('letters')}>
                <Stack spacing={0.5}>
                  {letterGroups.map(({ kind, letters }) => (
                    <Box key={kind} sx={mobileKeyGridSx(Math.min(Math.max(letters.length, 1), 6))}>
                      {letters.map((letter) => letterKey(letter, kind))}
                    </Box>
                  ))}
                </Stack>
              </Box>
              {navWell()}
            </>
          )}
        </Stack>
      </Box>
    </Slide>,
    document.body,
  )
}
