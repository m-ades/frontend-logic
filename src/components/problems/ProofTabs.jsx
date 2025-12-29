import * as React from 'react'
import { Box, Stack, Tabs, Tab, Typography, useTheme, useMediaQuery } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ProofEditor from './ProofEditor.jsx'
import LogicPenguinProblem from './LogicPenguinProblem.jsx'
import TruthTableEditor from './TruthTableEditor.jsx'

function TabPanel(props) {
  const { children, value, index, direction, ...other } = props;
  const isActive = value === index;

  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ 
        flexGrow: 1, 
        width: '100%', 
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
      {...other}
    >
      {isActive && (
        <Box 
          sx={{ 
            pl: { xs: 0, md: 3 }, 
            pr: { xs: 0, md: 3 }, 
            pt: { xs: 2, md: 0 }, 
            pb: 0, 
            overflowX: 'auto', 
            minWidth: 0, 
            width: '100%',
            height: { xs: 'calc(100vh - 220px)', md: 'calc(100vh - 200px)', lg: 'calc(100vh - 180px)' },
            overflowY: 'auto',
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  };
}

export default function ProofTabs({ 
  proofs,
  currentProofIndex, 
  onProofIndexChange, 
  completedProofs, 
  onProofComplete,
  getSavedProofState,
  handleProofStateChange
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const proofRefs = React.useRef({})
  const [direction, setDirection] = React.useState('forward')
  const prevIndexRef = React.useRef(currentProofIndex)
  
  const handleTabChange = (e, newValue) => {
    const currentProof = proofs[currentProofIndex]
    if (currentProof) {
      const proofEditorRef = proofRefs.current[currentProof.id]
      if (proofEditorRef) {
        const derivEl = proofEditorRef.querySelector('derivation-hurley')
        if (derivEl?.getState && !derivEl._isRestoring) {
          try {
            handleProofStateChange(currentProof.id, derivEl.getState())
          } catch (err) {
            // ignore
          }
        }
      }
    }
    
    // determine animation direction
    const prevIndex = prevIndexRef.current
    if (newValue > prevIndex) {
      setDirection('forward')
    } else if (newValue < prevIndex) {
      setDirection('backward')
    }
    prevIndexRef.current = newValue
    
    onProofIndexChange(newValue)
  }
  
  React.useEffect(() => {
    prevIndexRef.current = currentProofIndex
  }, [currentProofIndex])
  
  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mt: 0 }}>
      <Tabs
        orientation={isMobile ? 'horizontal' : 'vertical'}
        variant="scrollable"
        value={currentProofIndex}
        onChange={handleTabChange}
        aria-label="Problem tabs"
        textColor="primary"
        indicatorColor="primary"
        sx={{ 
          borderRight: { xs: 0, md: 0 },
          borderBottom: { xs: 0, md: 0 },
          minWidth: { xs: 'auto', md: 200 },
          maxWidth: { xs: '100%', md: 200 },
          '& .MuiTab-root': {
            color: '#2f6bff',
            transition: 'all 0.2s ease',
            minWidth: { xs: 'auto', md: 200 },
            fontSize: { xs: '0.875rem', md: '1rem' },
            textTransform: 'none',
            '&:hover': {
              color: '#2f6bff',
              backgroundColor: 'rgba(47, 107, 255, 0.08)',
            },
          },
          '& .MuiTab-root.Mui-selected': {
            color: '#2f6bff',
            fontWeight: 600,
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#2f6bff',
          },
        }}
      >
        {proofs.map((proof, idx) => (
          <Tab
            key={proof.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%' }}>
                <span>Problem {proof.questionId || proof.id}</span>
                {completedProofs.has(proof.id) && (
                  <CheckCircleIcon sx={{ color: '#2f6bff', fontSize: 16 }} />
                )}
              </Box>
            }
            {...a11yProps(idx)}
            sx={{ 
              textAlign: 'center',
              color: 'rgba(0, 0, 0, 0.9)',
              '&:hover': {
                color: '#2f6bff',
                '& span': {
                  color: '#2f6bff',
                },
              },
              '&.Mui-selected': {
                color: '#2f6bff',
                '& span': {
                  color: '#2f6bff',
                },
              },
            }}
          />
        ))}
      </Tabs>
      {proofs.map((proof, idx) => (
        <TabPanel key={proof.id} value={currentProofIndex} index={idx} direction={direction}>
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
              {proof.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontFamily: '"IBM Plex Sans", sans-serif' }}>
                  {proof.description}
                </Typography>
              )}
              <div ref={el => { if (el) proofRefs.current[proof.id] = el }}>
                {proof.type === 'truth-table' ? (
                  <TruthTableEditor
                    proof={proof}
                    savedState={getSavedProofState(proof.id)}
                    onStateChange={(state) => handleProofStateChange(proof.id, state)}
                    onProofComplete={onProofComplete}
                  />
                ) : proof.type === 'derivation' || !proof.type ? (
                  // only worksheets 14-16 and practice set (17) use derivation
                  // default to derivation if type is not specified (backwards compatibility)
                  <ProofEditor 
                    key={`proof-${proof.id}`} 
                    proof={proof} 
                    onProofComplete={onProofComplete}
                    savedState={getSavedProofState(proof.id)}
                    onStateChange={(state) => handleProofStateChange(proof.id, state)}
                  />
                ) : (
                  // all other problem types use LogicPenguinProblem
                  <LogicPenguinProblem
                    key={`proof-${proof.id}`}
                    proof={proof}
                    onProofComplete={onProofComplete}
                    savedState={getSavedProofState(proof.id)}
                    onStateChange={(state) => handleProofStateChange(proof.id, state)}
                  />
                )}
              </div>
            </Box>
          </Stack>
        </TabPanel>
      ))}
    </Box>
  )
}
