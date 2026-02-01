import * as React from 'react'
import { Box, Stack, Tabs, Tab, useTheme, useMediaQuery, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ProofEditor from './ProofEditor.jsx'
import LogicPenguinProblem from './LogicPenguinProblem.jsx'
import TruthTableEditor from './TruthTableEditor.jsx'
import { ProblemNavigationContext } from './ProblemNavigationContext.jsx'

function TabPanel(props) {
  const { children, value, index, direction, isMobile, ...other } = props;
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
        overflowX: 'hidden',
        overflowY: 'visible',
      }}
      {...other}
    >
      {isActive && (
        <Box 
          sx={{ 
            // let page scroll
            pl: { xs: 0, md: 3 }, 
            pr: { xs: 0, md: 3 }, 
            pt: { xs: 2, md: 0 }, 
            pb: 0, 
            overflowX: 'auto',
            overflowY: 'visible',
            minWidth: 0, 
            width: '100%',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
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
  handleProofStateChange,
  total,
  completionPercent,
  gradeLabel,
  isOverdue,
  isAssignmentLocked = true,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const proofRefs = React.useRef({})
  const [direction, setDirection] = React.useState('forward')
  const prevIndexRef = React.useRef(currentProofIndex)
  // lift fullscreen so Next keeps fullscreen and shows next question in fullscreen
  const [fullScreenOpen, setFullScreenOpen] = React.useState(false)
  const [fullScreenFocusTarget, setFullScreenFocusTarget] = React.useState(null)
  
  const handleTabChange = (e, newValue) => {
    const currentProof = proofs[currentProofIndex]
    if (currentProof) {
      const proofEditorRef = proofRefs.current[currentProof.id]
      if (proofEditorRef) {
        const derivEl = proofEditorRef.querySelector('derivation-hurley')
        if (derivEl?.getState && !derivEl._isRestoring) {
          try {
            handleProofStateChange(currentProof.id, derivEl.getState(), {
              assignmentQuestionId: currentProof.questionId
            })
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
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mt: 0, minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minWidth: { xs: 'auto', md: 200 },
        maxWidth: { xs: '100%', md: 200 },
      }}>
        <Tabs
          orientation={isMobile ? 'horizontal' : 'vertical'}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
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
                  <span>Problem {idx + 1}</span>
                  {(() => {
                    const isCorrect = completedProofs.has(proof.id)
                    const isLockedOut = !isCorrect
                      && Number.isFinite(proof.attemptLimit)
                      && Number.isFinite(proof.attemptCount)
                      && proof.attemptCount >= proof.attemptLimit
                    if (isCorrect) {
                      return <CheckCircleIcon sx={{ color: '#2f6bff', fontSize: 16 }} />
                    }
                    if (isLockedOut) {
                      return <CancelIcon sx={{ color: '#2f6bff', fontSize: 16 }} />
                    }
                    return null
                  })()}
                </Box>
              }
              {...a11yProps(idx)}
              sx={{ 
                textAlign: 'center',
                color: 'text.primary',
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
        {!isMobile && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 0
          }}>
            <Box sx={{
              fontSize: { xs: '0.875rem', md: '1rem' },
              color: 'text.primary',
              py: 1.5,
              px: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              textAlign: 'center',
              minWidth: { xs: 'auto', md: 200 },
              width: '100%'
            }}>
              <span>Total score: {gradeLabel}</span>
              {completionPercent === 100 && total > 0 && (
                <CheckCircleIcon sx={{ color: '#2f6bff', fontSize: 16 }} />
              )}
            </Box>
            {isOverdue && (
              <Box sx={{
                fontSize: { xs: '0.875rem', md: '1rem' },
                color: 'error.main',
                py: 1.5,
                px: 3,
                textAlign: 'center',
                minWidth: { xs: 'auto', md: 200 },
                width: '100%'
              }}>
                Past due
              </Box>
            )}
          </Box>
        )}
      </Box>
        {proofs.map((proof, idx) => {
          const isLast = idx >= proofs.length - 1
          const handleNext = isLast ? null : () => handleTabChange(null, idx + 1)
          return (
            <ProblemNavigationContext.Provider key={proof.id} value={{ onNext: handleNext }}>
              <TabPanel
                value={currentProofIndex}
                index={idx}
                direction={direction}
                isMobile={isMobile}
              >
                <Stack spacing={3} sx={{ minWidth: 0 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <div ref={el => { if (el) proofRefs.current[proof.id] = el }}>
                      {(() => {
                        const savedState = getSavedProofState(proof.id)
                        const shouldAttachAttempts = proof.type !== 'derivation' && proof.type !== 'derivation-hurley' && proof.type
                        const savedStateWithAttempts = shouldAttachAttempts
                          ? { ...(savedState || {}), attemptCount: proof.attemptCount ?? 0 }
                          : savedState
                        const isDerivation = proof.type === 'derivation' || proof.type === 'derivation-hurley' || !proof.type

                        if (proof.type === 'truth-table') {
                          return (
                            <TruthTableEditor
                              proof={proof}
                              savedState={savedStateWithAttempts}
                              onStateChange={(state) => handleProofStateChange(proof.id, state, {
                                assignmentQuestionId: proof.questionId
                              })}
                              onProofComplete={onProofComplete}
                            />
                          )
                        }

                        if (isDerivation) {
                          // only worksheets 14-16 and practice set (17) use derivation
                          // default to derivation if type is not specified (backwards compatibility)
                          return (
                            <ProofEditor
                              key={`proof-${proof.id}`}
                              proof={proof}
                              onProofComplete={onProofComplete}
                              savedState={savedStateWithAttempts}
                              onStateChange={(state) => handleProofStateChange(proof.id, state, {
                                assignmentQuestionId: proof.questionId
                              })}
                              isAssignmentLocked={isAssignmentLocked}
                              fullScreenOpen={fullScreenOpen}
                              fullScreenFocusTarget={fullScreenFocusTarget}
                              onOpenFullScreen={(focusTarget) => {
                                setFullScreenFocusTarget(focusTarget ?? null)
                                setFullScreenOpen(true)
                              }}
                              onCloseFullScreen={() => {
                                setFullScreenOpen(false)
                                setFullScreenFocusTarget(null)
                              }}
                            />
                          )
                        }

                        return (
                          <LogicPenguinProblem
                            key={`proof-${proof.id}`}
                            proof={proof}
                            onProofComplete={onProofComplete}
                            savedState={savedStateWithAttempts}
                            onStateChange={(state) => handleProofStateChange(proof.id, state, {
                              assignmentQuestionId: proof.questionId
                            })}
                          />
                        )
                      })()}
                    </div>
                  </Box>
                </Stack>
              </TabPanel>
            </ProblemNavigationContext.Provider>
          )
        })}
    </Box>
  )
}
