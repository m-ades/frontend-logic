import { useState } from 'react'
import { Box, Typography, IconButton, Drawer, alpha, useMediaQuery, useTheme } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useLayoutState, useLayoutDispatch, closeRulesReference } from '../../context/LayoutContext.jsx'
import { getSymbols, normalizeLogicSystem } from '../../lib/logicSystems.js'
import {
  FITCH_DEFINITIONS,
  FITCH_FOL_RULE_GROUPS,
  FITCH_TFL_RULE_GROUPS,
} from '../../lib/fitchRulebook.js'
import { FITCH_RULE_EXAMPLES } from '../../lib/fitchRuleExamples.js'
import MathJaxFormula from './MathJaxFormula.jsx'

function RulesCard({ title, children, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
      <Box
        sx={{
          width: '100%',
          mb: 1,
        }}
      >
        <Box 
        onClick={() => setExpanded(!expanded)}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '10px 12px',
          color: 'primary.main',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            color: 'primary.main',
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'inherit',
            fontWeight: expanded ? 600 : 400,
            fontSize: '0.9rem',
          }}
        >
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          sx={{ 
            color: 'inherit',
            padding: '4px',
            '&:hover': { backgroundColor: 'transparent' }
          }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      {expanded && (
        <Box 
          sx={{ 
            fontSize: '0.9rem', 
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
      <Typography component="h4" sx={{ m: 0, fontSize: '0.85rem', fontWeight: 700 }}>
        {group.start + index}. {rule.title} ({rule.name})
      </Typography>
      <Typography component="div" sx={{ mt: 0.6, fontSize: '0.8rem', color: 'text.primary' }}>
        <EmphasizedText text={rule.description} bold={rule.bold} />
      </Typography>
      {(FITCH_RULE_EXAMPLES[rule.name] || []).map((example, exampleIndex) => (
        <Box
          key={`${rule.name}-${exampleIndex}`}
          sx={{
            width: '100%',
            my: 1,
            px: 1,
            py: 0.75,
            minHeight: 44,
            overflowX: 'auto',
            textAlign: 'center',
            borderRadius: 1,
            bgcolor: (t) => alpha(t.palette.text.primary, 0.035),
            '& mjx-container': { m: '0 !important' },
          }}
        >
          <MathJaxFormula
            key={example}
            tex={example}
            fallback={`${rule.title} (${rule.name}) proof example${FITCH_RULE_EXAMPLES[rule.name].length > 1 ? ` ${exampleIndex + 1}` : ''}`}
          />
        </Box>
      ))}
      {rule.note && (
        <Typography component="div" sx={{ mt: 0.6, fontSize: '0.78rem', color: 'text.secondary' }}>
          {rule.noteLabelBold ? <strong>Note:</strong> : 'Note:'}{' '}
          <EmphasizedText text={rule.note} bold={rule.noteBold} />
        </Typography>
      )}
      {rule.notes?.map((note) => (
        <Typography key={note.text} component="div" sx={{ mt: 0.6, fontSize: '0.78rem', color: 'text.secondary' }}>
          {note.labelBold ? <strong>Note:</strong> : 'Note:'}{' '}
          <EmphasizedText text={note.text} bold={note.bold} />
        </Typography>
      ))}
    </Box>
  ))
}

function FitchRuleGroup({ group }) {
  const [expanded, setExpanded] = useState(true)

  if (!group.title) {
    return <FitchRuleEntries group={group} />
  }

  return (
    <Box sx={{ '&:not(:last-child)': { mb: 1 } }}>
      <Box
        component="button"
        type="button"
        aria-expanded={expanded}
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
        <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
          {group.title}
        </Typography>
        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>
      {expanded && <FitchRuleEntries group={group} />}
    </Box>
  )
}

function FitchRuleGroups({ groups }) {
  return groups.map((group) => (
    <FitchRuleGroup key={group.title || `rules-${group.start}`} group={group} />
  ))
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
  
  const blurActiveElement = () => {
    const el = document.activeElement
    if (el && typeof el.blur === 'function') {
      el.blur()
    }
  }

  const handleClose = () => {
    closeRulesReference(dispatch)
    blurActiveElement()
  }
  
  const rulesContent = (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        p: 1.5,
      }}
    >
      <RulesCard title="Keyboard Shortcuts" defaultExpanded={true}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
          Symbols
        </Typography>
        <Box component="div" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
          <div><strong>{symbols.and}</strong> Type <strong>&</strong> or <strong>^</strong> for {symbols.and} (conjunction)</div>
          <div><strong>{symbols.or}</strong> Type <strong>v</strong> or <strong>\/</strong> for {symbols.or} (disjunction)</div>
          <div><strong>{symbols.conditional}</strong> Type <strong>{'>'}</strong>, <strong>-&gt;</strong>, or <strong>--&gt;</strong> for {symbols.conditional} (conditional)</div>
          <div><strong>{symbols.biconditional}</strong> Type <strong>==</strong> or <strong>&lt;-&gt;</strong> for {symbols.biconditional} (biconditional)</div>
          <div><strong>{symbols.not}</strong> Type <strong>~</strong> or <strong>!</strong> for {symbols.not} (negation)</div>
          <div><strong>{symbols.forall}</strong> Type <strong>all</strong> for {symbols.forall} (universal quantifier)</div>
          <div><strong>{symbols.exists}</strong> Type <strong>some</strong> for {symbols.exists} (existential quantifier)</div>
          {symbols.falsum && (
            <div><strong>{symbols.falsum}</strong> Type <strong>#</strong>, <strong>_</strong>, or <strong>XX</strong> for {symbols.falsum} (contradiction)</div>
          )}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
          Navigation
        </Typography>
        <Box component="div" sx={{ fontSize: '0.85rem' }}>
          <div><strong>•</strong> Press <strong>Enter</strong> to go to the justification line</div>
        </Box>
      </RulesCard>
      
      <RulesCard title={isFitch ? 'Natural Deduction Rules for TFL' : 'Rules of Inference'} defaultExpanded={false}>
        {isFitch ? (
          <>
            <Box sx={{ mb: 2, p: 1, borderRadius: 1, bgcolor: (t) => alpha(t.palette.primary.main, 0.06) }}>
              <Typography component="div" sx={{ mb: 0.75, fontSize: '0.85rem', fontWeight: 700 }}>Definitions</Typography>
              {FITCH_DEFINITIONS.map((definition) => (
                <Typography key={definition.text} component="p" sx={{ m: 0, '&:not(:last-child)': { mb: 1 }, fontSize: '0.8rem', color: 'text.primary' }}>
                  <EmphasizedText text={definition.text} bold={definition.bold} />
                </Typography>
              ))}
            </Box>
            <FitchRuleGroups groups={FITCH_TFL_RULE_GROUPS} />
          </>
        ) : (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
              Rules of Implication
            </Typography>
            <Box component="div" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
              <div><strong>1. MP:</strong> p ⊃ q, p / q</div>
              <div><strong>2. MT:</strong> p ⊃ q, ~q / ~p</div>
              <div><strong>3. HS:</strong> p ⊃ q, q ⊃ r / p ⊃ r</div>
              <div><strong>4. DS:</strong> p ∨ q, ~p / q</div>
              <div><strong>5. CD:</strong> (p ⊃ q) • (r ⊃ s), p ∨ r / q ∨ s</div>
              <div><strong>6. Simp:</strong> p • q / p</div>
              <div><strong>7. Conj:</strong> p, q / p • q</div>
              <div><strong>8. Add:</strong> p / p ∨ q</div>
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
              Rules of Replacement
            </Typography>
            <Box component="div" sx={{ fontSize: '0.85rem' }}>
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
      
      <RulesCard title={isFitch ? 'Natural Deduction Rules for FOL' : 'Predicate Logic Rules'} defaultExpanded={false}>
        {!isFitch && (
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
            Predicate Logic Rules
          </Typography>
        )}
        {isFitch ? (
          <FitchRuleGroups groups={FITCH_FOL_RULE_GROUPS} />
        ) : (
          <>
            <Box component="div" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
              <div><strong>UI:</strong> (x)Fx / Fx &nbsp;or&nbsp; (x)Fx / Fa</div>
              <div><strong>UG:</strong> Fx / (x)Fx</div>
              <div><strong>EI:</strong> (∃x)Fx / Fa</div>
              <div><strong>EG:</strong> Fa / (∃x)Fx &nbsp;or&nbsp; Fx / (∃x)Fx</div>
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
              Quantifier Negation (QN)
            </Typography>
            <Box component="div" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
              <div><strong>QN:</strong> ~(x)Fx :: (∃x)~Fx</div>
              <div><strong>QN:</strong> ~(∃x)Fx :: (x)~Fx</div>
              <div><strong>QN:</strong> (x)Fx :: ~(∃x)~Fx</div>
              <div><strong>QN:</strong> (∃x)Fx :: ~(x)~Fx</div>
            </Box>
          </>
        )}
      </RulesCard>

      {!isFitch && (
        <RulesCard title="Conditional & Indirect Proofs" defaultExpanded={false}>
          <Box component="div" sx={{ fontSize: '0.85rem' }}>
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
      <IconButton onClick={handleClose}>
        <ExpandLessIcon />
      </IconButton>
    </Box>
  )

  if (isDesktop) {
    return (
      <Box
        sx={{
          width: isRulesReferenceOpen ? 'clamp(380px, 32vw, 520px)' : 0,
          maxWidth: isRulesReferenceOpen ? 'min(520px, 40vw)' : 0,
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
      sx={{
        display: 'block',
        '& .MuiDrawer-paper': {
          width: { xs: '92%', sm: '480px' },
          maxWidth: 'min(480px, 92vw)',
        },
      }}
    >
      {header}
      {rulesContent}
    </Drawer>
  )
}
