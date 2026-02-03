import * as React from 'react'
import { Box, Stack, Tabs, Tab, useTheme, useMediaQuery, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ProofEditor from './ProofEditor.jsx'
import LogicPenguinProblem from './LogicPenguinProblem.jsx'
import TruthTableEditor from './TruthTableEditor.jsx'
import { ProblemNavigationContext } from './ProblemNavigationContext.jsx'
import { allowPartialForProof, displayScoreForProof } from '../../utils/problemHelpers.js'

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

function ProofTabs({
  proofs,
  currentProofIndex, 
  onProofIndexChange, 
  completedProofs,
  questionScores = {},
  onProofComplete,
  getSavedProofState,
  handleProofStateChange,
  total,
  completionPercent,
  gradeLabel,
  isOverdue,
  isAssignmentLocked = true,
  isInstructorView = false,
  onQuestionSaved,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isPhone = useMediaQuery(theme.breakpoints.down('sm')) // fullscreen layout only on phones
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
          {proofs.map((proof, idx) => {
            const totalQuestions = proofs.length
            const pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0
            const maxLabel = pointsPerQuestion % 1 === 0
              ? String(Math.round(pointsPerQuestion))
              : pointsPerQuestion.toFixed(1)
            return (
            <Tab
              key={proof.id}
              label={
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: isPhone && fullScreenOpen ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isPhone && fullScreenOpen ? 1 : 0.25,
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span>Problem {idx + 1}</span>
                    {(() => {
                      const isCorrect = completedProofs.has(proof.id)
                      const isLockedOut = !isCorrect
                        && Number.isFinite(proof.attemptLimit)
                        && Number.isFinite(proof.attemptCount)
                        && proof.attemptCount >= proof.attemptLimit
                      const rawScore = questionScores[proof.questionId]
                      const hasScore = rawScore != null && Number.isFinite(Number(rawScore))
                      const allowPartial = allowPartialForProof(proof, rawScore)
                      const score = displayScoreForProof(proof, rawScore)
                      const isCorrectStatus = isCorrect || (hasScore && score >= 100)
                      const isIncorrectStatus = (hasScore && score === 0) || (isLockedOut && !hasScore)
                      const isPartialStatus = allowPartial && hasScore && score > 0 && score < 100
                      if (isCorrectStatus) {
                        return <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} aria-label="Correct" />
                      }
                      if (isIncorrectStatus) {
                        return <CancelIcon sx={{ fontSize: 18, color: 'error.main' }} aria-label="Incorrect" />
                      }
                      if (isPartialStatus) {
                        return <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} aria-label="Partial credit" />
                      }
                      return null
                    })()}
                  </Box>
                  {(() => {
                    const isCorrect = completedProofs.has(proof.id)
                    const isLockedOut = !isCorrect
                      && Number.isFinite(proof.attemptLimit)
                      && Number.isFinite(proof.attemptCount)
                      && proof.attemptCount >= proof.attemptLimit
                    const rawScore = questionScores[proof.questionId]
                    const hasScore = rawScore != null && Number.isFinite(Number(rawScore))
                    const allowPartial = allowPartialForProof(proof, rawScore)
                    const score = displayScoreForProof(proof, rawScore)
                    if (hasScore) {
                      const earned = (Number(score) / 100) * pointsPerQuestion
                      const earnedLabel = earned % 1 === 0 ? String(Math.round(earned)) : earned.toFixed(1)
                      const color = score >= 100 ? theme.palette.success.main : score > 0 ? theme.palette.text.secondary : theme.palette.error.main
                      return (
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color }}>
                          {earnedLabel}/{maxLabel}
                        </span>
                      )
                    }
                    if (isCorrect) {
                      return (
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.success.main }}>
                          {maxLabel}/{maxLabel}
                        </span>
                      )
                    }
                    if (isLockedOut) {
                      return (
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.error.main }}>
                          0/{maxLabel}
                        </span>
                      )
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
            )
          })}
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
                              isAssignmentLocked={isAssignmentLocked}
                              isInstructorView={isInstructorView}
                              onQuestionSaved={onQuestionSaved}
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
                              totalQuestions={proofs.length}
                              isCurrentCorrect={completedProofs.has(proof.id)}
                              currentQuestionScore={displayScoreForProof(proof, questionScores[proof.questionId])}
                              isInstructorView={isInstructorView}
                              onQuestionSaved={onQuestionSaved}
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
                            isAssignmentLocked={isAssignmentLocked}
                            isInstructorView={isInstructorView}
                            onQuestionSaved={onQuestionSaved}
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

export default ProofTabs
