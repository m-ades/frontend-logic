import { useState } from 'react'
import { Box, Typography, IconButton, Drawer, alpha, useMediaQuery, useTheme } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useLayoutState, useLayoutDispatch, closeRulesReference } from '../../context/LayoutContext.jsx'

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

export default function RulesReference() {
  const { isRulesReferenceOpen } = useLayoutState()
  const dispatch = useLayoutDispatch()
  const theme = useTheme()
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'))
  const hasDesktopPointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const isDesktop = isLargeScreen && hasDesktopPointer
  
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
          <div><strong>•</strong> Type <strong>&</strong> or <strong>^</strong> for • (conjunction)</div>
          <div><strong>•</strong> Type <strong>v</strong> for ∨ (disjunction)</div>
          <div><strong>•</strong> Type <strong>{'>'}</strong> or <strong>→</strong> or <strong>--&gt;</strong> for ⊃ (conditional)</div>
          <div><strong>•</strong> Type <strong>==</strong> for ≡ (biconditional)</div>
          <div><strong>•</strong> Type <strong>all</strong> for ∀ (universal quantifier)</div>
          <div><strong>•</strong> Type <strong>some</strong> for ∃ (existential quantifier)</div>
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
          Navigation
        </Typography>
        <Box component="div" sx={{ fontSize: '0.85rem' }}>
          <div><strong>•</strong> Press <strong>Enter</strong> to go to the justification line</div>
        </Box>
      </RulesCard>
      
      <RulesCard title="Rules of Reference" defaultExpanded={false}>
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
      </RulesCard>
      
      <RulesCard title="Predicate Logic Rules" defaultExpanded={false}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main', fontSize: '0.95rem' }}>
          Predicate Logic Rules
        </Typography>
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
      </RulesCard>

      <RulesCard title="Conditional & Indirect Proofs" defaultExpanded={false}>
        <Box component="div" sx={{ fontSize: '0.85rem' }}>
          <div><strong>ACP:</strong> Assumption for Conditional Proof</div>
          <div><strong>CP:</strong> To prove p ⊃ q, assume p (ACP) in an indented subderivation, derive q, then discharge with CP citing the subderivation range</div>
          <div><strong>AIP:</strong> Assumption for Indirect Proof</div>
          <div><strong>IP:</strong> To prove ~p, assume p (AIP) in an indented subderivation, derive a contradiction (q • ~q), then discharge with IP citing the subderivation range</div>
        </Box>
      </RulesCard>
    </Box>
  )
  
  const header = (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="h6">Rulebook</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          Logic Rules & Shortcuts
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
          width: isRulesReferenceOpen ? 'clamp(280px, 24vw, 360px)' : 0,
          maxWidth: isRulesReferenceOpen ? 'min(360px, 32vw)' : 0,
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
          width: { xs: '85%', sm: '400px' },
          maxWidth: '400px',
        },
      }}
    >
      {header}
      {rulesContent}
    </Drawer>
  )
}
