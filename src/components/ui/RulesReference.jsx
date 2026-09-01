import { useCallback, useEffect, useId, useState } from 'react'
import { Box, Typography, IconButton, Drawer, alpha, useMediaQuery, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useLayoutState, useLayoutDispatch, setRulesReferenceOpen } from '../../context/LayoutContext.jsx'
import { getSymbols, normalizeLogicSystem } from '../../lib/logicSystems.js'
import {
  FITCH_DEFINITIONS,
  FITCH_FOL_RULE_GROUPS,
  FITCH_TFL_RULE_GROUPS,
} from '../../lib/fitchRulebook.js'
import { FITCH_RULE_EXAMPLES } from '../../lib/fitchRuleExamples.js'
import { displayLogicText } from '../../lib/logicText.js'
import MathJaxFormula from './MathJaxFormula.jsx'

function RulesCard({ title, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const accordionId = useId()
  const triggerId = `${accordionId}-trigger`
  const contentId = `${accordionId}-content`

  return (
    <Box sx={{ width: '100%', mb: 1 }}>
      <Box
        component="button"
        type="button"
        id={triggerId}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
        sx={{
          width: '100%',
          border: 0,
          bgcolor: 'transparent',
          font: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          color: 'primary.main',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'color 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            color: 'primary.main',
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '-2px',
          },
        }}
      >
        <Typography
          component="span"
          sx={{
            color: 'inherit',
            fontWeight: expanded ? 600 : 400,
            fontSize: '1rem',
          }}
        >
          {title}
        </Typography>
        {expanded
          ? <ExpandLessIcon aria-hidden="true" fontSize="small" />
          : <ExpandMoreIcon aria-hidden="true" fontSize="small" />}
      </Box>
      {expanded && (
        <Box
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          sx={{
            fontSize: '1rem',
            lineHeight: 1.5,
            color: 'text.primary',
            padding: '8px 12px',
            paddingTop: '6px',
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}

function EmphasizedText({ text, bold = [] }) {
  if (!bold.length) return text
  const escaped = bold.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'g'))
  return parts.map((part, index) => (
    bold.includes(part) ? <strong key={`${part}-${index}`}>{part}</strong> : part
  ))
}

function FitchRuleEntries({ group }) {
  return group.rules.map((rule, index) => (
    <Box
      key={rule.name}
      component="section"
      sx={{ px: 0.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}
    >
      <Typography component="h4" sx={{ m: 0, fontSize: '1rem', fontWeight: 700 }}>
        {group.start + index}. {rule.title} ({displayLogicText(rule.name)})
      </Typography>
      <Typography component="div" sx={{ mt: 0.6, fontSize: '1rem', color: 'text.primary' }}>
        <EmphasizedText text={displayLogicText(rule.description)} bold={rule.bold} />
      </Typography>
      {(FITCH_RULE_EXAMPLES[rule.name] || []).map((example, exampleIndex) => (
        <Box
          key={`${rule.name}-${exampleIndex}`}
          sx={{
            width: '100%',
            my: 1,
            px: 1,
            py: 0.75,
            overflowX: 'auto',
            overflowY: 'hidden',
            textAlign: 'center',
            borderRadius: 1,
            bgcolor: (t) => alpha(t.palette.text.primary, 0.035),
            '& mjx-container': {
              display: 'block !important',
              m: '0 !important',
            },
            '& mjx-container > svg': {
              display: 'block',
              mx: 'auto',
            },
          }}
        >
          <MathJaxFormula
            key={example}
            tex={example}
            fallback={`${rule.title} (${displayLogicText(rule.name)}) proof example${FITCH_RULE_EXAMPLES[rule.name].length > 1 ? ` ${exampleIndex + 1}` : ''}`}
          />
        </Box>
      ))}
      {rule.note && (
        <Typography component="div" sx={{ mt: 0.6, fontSize: '1rem', color: 'text.secondary' }}>
          {rule.noteLabelBold ? <strong>Note:</strong> : 'Note:'}{' '}
          <EmphasizedText text={rule.note} bold={rule.noteBold} />
        </Typography>
      )}
      {rule.notes?.map((note) => (
        <Typography key={note.text} component="div" sx={{ mt: 0.6, fontSize: '1rem', color: 'text.secondary' }}>
          {note.labelBold ? <strong>Note:</strong> : 'Note:'}{' '}
          <EmphasizedText text={note.text} bold={note.bold} />
        </Typography>
      ))}
    </Box>
  ))
}

function FitchRuleGroup({ group }) {
  const [expanded, setExpanded] = useState(true)
  const accordionId = useId()
  const triggerId = `${accordionId}-trigger`
  const contentId = `${accordionId}-content`

  if (!group.title) {
    return <FitchRuleEntries group={group} />
  }

  return (
    <Box sx={{ '&:not(:last-child)': { mb: 1 } }}>
      <Box
        component="button"
        type="button"
        id={triggerId}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
        sx={{
          width: '100%',
          border: 0,
          borderRadius: 1,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
          color: 'primary.main',
          py: 1,
          px: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          textAlign: 'left',
          cursor: 'pointer',
          '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.1) },
        }}
      >
        <Typography component="span" sx={{ fontWeight: 700, fontSize: '1rem' }}>
          {group.title}
        </Typography>
        {expanded
          ? <ExpandLessIcon aria-hidden="true" fontSize="small" />
          : <ExpandMoreIcon aria-hidden="true" fontSize="small" />}
      </Box>
      {expanded && (
        <Box id={contentId} role="region" aria-labelledby={triggerId}>
          <FitchRuleEntries group={group} />
        </Box>
      )}
    </Box>
  )
}

function FitchRuleGroups({ groups }) {
  return groups.map((group) => (
    <FitchRuleGroup key={group.title || `rules-${group.start}`} group={group} />
  ))
}

function ShortcutTable({ rows }) {
  const headerSx = {
    pb: 0.6,
    color: 'text.secondary',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textAlign: 'left',
    textTransform: 'uppercase',
  }

  return (
    <Box component="table" sx={{ width: '100%', mb: 1.5, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <Box component="thead">
        <Box component="tr">
          <Box component="th" sx={headerSx}>Symbol</Box>
          <Box component="th" sx={headerSx}>Shortcut</Box>
          <Box component="th" sx={headerSx}>Meaning</Box>
        </Box>
      </Box>
      <Box component="tbody">
        {rows.map(({ symbol, shortcuts, meaning }) => (
          <Box component="tr" key={`${symbol}-${meaning}`}>
            <Box
              component="th"
              scope="row"
              sx={{ py: 0.75, pr: 1, fontSize: '1rem', fontWeight: 600, textAlign: 'left' }}
            >
              {symbol}
            </Box>
            <Box component="td" sx={{ py: 0.75, pr: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {shortcuts.map((shortcut) => (
                  <Box
                    component="kbd"
                    key={shortcut}
                    sx={{
                      minWidth: '1.6rem',
                      px: 0.5,
                      py: 0.1,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 0.75,
                      bgcolor: 'transparent',
                      color: 'text.primary',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      lineHeight: 1.4,
                      textAlign: 'center',
                    }}
                  >
                    {shortcut}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="td" sx={{ py: 0.75, color: 'text.secondary', fontSize: '1rem' }}>
              {meaning}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default function RulesReference({ logicSystem }) {
  const { isRulesReferenceOpen } = useLayoutState()
  const dispatch = useLayoutDispatch()
  const theme = useTheme()
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'))
  const hasDesktopPointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const isDesktop = isLargeScreen && hasDesktopPointer
  const activeLogicSystem = normalizeLogicSystem(logicSystem)
  const symbols = getSymbols(activeLogicSystem)
  const isFitch = activeLogicSystem === 'fitch'
  const shortcutRows = [
    { symbol: symbols.and, shortcuts: ['&', '^'], meaning: 'Conjunction' },
    { symbol: symbols.or, shortcuts: ['v', '\\/'], meaning: 'Disjunction' },
    { symbol: symbols.conditional, shortcuts: ['>', '->', '-->'], meaning: 'Conditional' },
    { symbol: symbols.biconditional, shortcuts: ['==', '<->'], meaning: 'Biconditional' },
    { symbol: symbols.not, shortcuts: ['~', '!'], meaning: 'Negation' },
    { symbol: symbols.forall, shortcuts: ['all'], meaning: 'Universal quantifier' },
    { symbol: symbols.exists, shortcuts: ['some'], meaning: 'Existential quantifier' },
    ...(symbols.falsum
      ? [{ symbol: symbols.falsum, shortcuts: ['#', 'XX'], meaning: 'Contradiction' }]
      : []),
    ...(isFitch
      ? [
          { symbol: '∴', shortcuts: [':.'], meaning: 'Therefore' },
          { symbol: 'x₂', shortcuts: ['_'], meaning: 'Numeric subscript' },
        ]
      : []),
  ]
  
  const handleClose = useCallback(() => {
    setRulesReferenceOpen(dispatch, false)
    window.requestAnimationFrame(() => {
      document.getElementById('rules-reference-trigger')?.focus()
    })
  }, [dispatch])

  useEffect(() => {
    if (!isDesktop || !isRulesReferenceOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      handleClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, isDesktop, isRulesReferenceOpen])
  
  const rulesContent = (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        p: 1.5,
      }}
    >
      <RulesCard title="Keyboard Shortcuts">
        <ShortcutTable rows={shortcutRows} />
      </RulesCard>
      
      <RulesCard title={isFitch ? 'Natural Deduction Rules for TFL' : 'Rules of Inference'}>
        {isFitch ? (
          <>
            <Box sx={{ mb: 2, p: 1, borderRadius: 1, bgcolor: (t) => alpha(t.palette.primary.main, 0.06) }}>
              <Typography component="div" sx={{ mb: 0.75, fontSize: '1rem', fontWeight: 700 }}>Definitions</Typography>
              {FITCH_DEFINITIONS.map((definition) => (
                <Typography key={definition.text} component="p" sx={{ m: 0, '&:not(:last-child)': { mb: 1 }, fontSize: '1rem', color: 'text.primary' }}>
                  <EmphasizedText text={definition.text} bold={definition.bold} />
                </Typography>
              ))}
            </Box>
            <FitchRuleGroups groups={FITCH_TFL_RULE_GROUPS} />
          </>
        ) : (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '1rem' }}>
              Rules of Implication
            </Typography>
            <Box component="div" sx={{ mb: 1.5, fontSize: '1rem' }}>
              <div><strong>1. MP:</strong> p ⊃ q, p / q</div>
              <div><strong>2. MT:</strong> p ⊃ q, ~q / ~p</div>
              <div><strong>3. HS:</strong> p ⊃ q, q ⊃ r / p ⊃ r</div>
              <div><strong>4. DS:</strong> p ∨ q, ~p / q</div>
              <div><strong>5. CD:</strong> (p ⊃ q) • (r ⊃ s), p ∨ r / q ∨ s</div>
              <div><strong>6. Simp:</strong> p • q / p</div>
              <div><strong>7. Conj:</strong> p, q / p • q</div>
              <div><strong>8. Add:</strong> p / p ∨ q</div>
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '1rem' }}>
              Rules of Replacement
            </Typography>
            <Box component="div" sx={{ fontSize: '1rem' }}>
              <div><strong>9. DM:</strong></div>
              <div style={{ paddingLeft: '28px' }}>~(p • q) :: (~p ∨ ~q)</div>
              <div style={{ paddingLeft: '28px' }}>~(p ∨ q) :: (~p • ~q)</div>
              <div><strong>10. Com:</strong></div>
              <div style={{ paddingLeft: '28px' }}>(p ∨ q) :: (q ∨ p)</div>
              <div style={{ paddingLeft: '28px' }}>(p • q) :: (q • p)</div>
              <div><strong>11. Assoc:</strong></div>
              <div style={{ paddingLeft: '28px' }}>[p ∨ (q ∨ r)] :: [(p ∨ q) ∨ r]</div>
              <div style={{ paddingLeft: '28px' }}>[p • (q • r)] :: [(p • q) • r]</div>
              <div><strong>12. Dist:</strong></div>
              <div style={{ paddingLeft: '28px' }}>[p • (q ∨ r)] :: [(p • q) ∨ (p • r)]</div>
              <div style={{ paddingLeft: '28px' }}>[p ∨ (q • r)] :: [(p ∨ q) • (p ∨ r)]</div>
              <div><strong>13. DN:</strong></div>
              <div style={{ paddingLeft: '28px' }}>p :: ~~p</div>
              <div><strong>14. Trans:</strong></div>
              <div style={{ paddingLeft: '28px' }}>(p ⊃ q) :: (~q ⊃ ~p)</div>
              <div><strong>15. Impl:</strong></div>
              <div style={{ paddingLeft: '28px' }}>(p ⊃ q) :: (~p ∨ q)</div>
              <div><strong>16. Equiv:</strong></div>
              <div style={{ paddingLeft: '28px' }}>(p ≡ q) :: [(p ⊃ q) • (q ⊃ p)]</div>
              <div style={{ paddingLeft: '28px' }}>(p ≡ q) :: [(p • q) ∨ (~p • ~q)]</div>
              <div><strong>17. Exp:</strong></div>
              <div style={{ paddingLeft: '28px' }}>[(p • q) ⊃ r] :: [p ⊃ (q ⊃ r)]</div>
              <div><strong>18. Taut:</strong></div>
              <div style={{ paddingLeft: '28px' }}>p :: (p ∨ p)</div>
              <div style={{ paddingLeft: '28px' }}>p :: (p • p)</div>
            </Box>
          </>
        )}
      </RulesCard>
      
      <RulesCard title={isFitch ? 'Natural Deduction Rules for FOL' : 'Predicate Logic Rules'}>
        {!isFitch && (
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '1rem' }}>
            Predicate Logic Rules
          </Typography>
        )}
        {isFitch ? (
          <FitchRuleGroups groups={FITCH_FOL_RULE_GROUPS} />
        ) : (
          <>
            <Box component="div" sx={{ mb: 1.5, fontSize: '1rem' }}>
              <div><strong>UI:</strong> (x)Fx / Fx &nbsp;or&nbsp; (x)Fx / Fa</div>
              <div><strong>UG:</strong> Fx / (x)Fx</div>
              <div><strong>EI:</strong> (∃x)Fx / Fa</div>
              <div><strong>EG:</strong> Fa / (∃x)Fx &nbsp;or&nbsp; Fx / (∃x)Fx</div>
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '1rem' }}>
              Quantifier Negation (QN)
            </Typography>
            <Box component="div" sx={{ mb: 1.5, fontSize: '1rem' }}>
              <div><strong>QN:</strong> ~(x)Fx :: (∃x)~Fx</div>
              <div><strong>QN:</strong> ~(∃x)Fx :: (x)~Fx</div>
              <div><strong>QN:</strong> (x)Fx :: ~(∃x)~Fx</div>
              <div><strong>QN:</strong> (∃x)Fx :: ~(x)~Fx</div>
            </Box>
          </>
        )}
      </RulesCard>

      {!isFitch && (
        <RulesCard title="Conditional & Indirect Proofs">
          <Box component="div" sx={{ fontSize: '1rem' }}>
            <div><strong>ACP:</strong> Assumption for Conditional Proof</div>
            <div><strong>CP:</strong> To prove p ⊃ q, assume p (ACP) in an indented subderivation, derive q, then discharge with CP citing the subderivation range</div>
            <div><strong>AIP:</strong> Assumption for Indirect Proof</div>
            <div><strong>IP:</strong> To prove ~p, assume p (AIP) in an indented subderivation, derive a contradiction (q • ~q), then discharge with IP citing the subderivation range</div>
          </Box>
        </RulesCard>
      )}
    </Box>
  )
  
  const header = (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="h2" sx={{ fontSize: '1.142rem', fontWeight: 600 }}>Rulebook</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          {isFitch ? 'Fitch rules & shortcuts' : 'Hurley rules & shortcuts'}
        </Typography>
      </Box>
      <IconButton onClick={handleClose} aria-label="Close rulebook">
        <CloseIcon />
      </IconButton>
    </Box>
  )

  if (isDesktop) {
    return (
      <Box
        component="aside"
        id="rules-reference"
        aria-label="Rulebook"
        sx={{
          width: isRulesReferenceOpen ? 'clamp(480px, 40vw, 680px)' : 0,
          maxWidth: isRulesReferenceOpen ? 'min(680px, 48vw)' : 0,
          minWidth: 0,
          flexShrink: 0,
          overflow: 'hidden',
          borderLeft: isRulesReferenceOpen ? 1 : 0,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          transition: (t) => t.transitions.create(['width', 'border-color'], {
            duration: t.transitions.duration.shorter,
          }),
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
        }}
      >
        {isRulesReferenceOpen && (
          <>
            {header}
            {rulesContent}
          </>
        )}
      </Box>
    )
  }

  return (
    <Drawer
      anchor="right"
      open={isRulesReferenceOpen}
      onClose={handleClose}
      ModalProps={{
        keepMounted: true,
      }}
      slotProps={{
        paper: {
          id: 'rules-reference',
          'aria-label': 'Rulebook',
        },
      }}
      sx={{
        display: 'block',
        '& .MuiDrawer-paper': {
          width: { xs: '92%', sm: '560px' },
          maxWidth: 'min(560px, 92vw)',
        },
      }}
    >
      {header}
      {rulesContent}
    </Drawer>
  )
}
