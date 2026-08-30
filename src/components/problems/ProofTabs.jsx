import * as React from 'react'
import { Box, Stack, Tabs, Tab, useTheme, useMediaQuery, Chip, Button, Menu, MenuItem } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AddIcon from '@mui/icons-material/Add'
import ProofEditor from './ProofEditor.jsx'
import LogicPenguinProblem from './LogicPenguinProblem.jsx'
import TruthTableEditor from './truth-table/TruthTableEditor.jsx'
import { ProblemNavigationContext } from './ProblemNavigationContext.jsx'
import { allowPartialForProof, displayScoreForProof } from '../../utils/problemHelpers.js'
import InstructorQuestionEditor from './InstructorQuestionEditor.jsx'
import { getDerivationProblemType, isDerivationProblemType } from '../../lib/logicSystems.js'
import { instructorProblemTypes } from '../../lib/instructorProblemTypes.js'

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

const problemTypeLabels = {
  'multiple-choice': 'Multiple choice',
  'symbolic-translation': 'Translation',
  'combo-translation-truth-table': 'Translation and truth tables',
  'combo-translation-derivation': 'Translation and derivations',
  'truth-table': 'Truth tables',
  'partial-truth-table': 'Partial truth tables',
  'indirect-truth-table': 'Indirect truth tables',
  'nonclassical-truth-table': 'Nonclassical truth tables',
  'single-row-truth-table': 'Single-row truth tables',
  'derivation': 'Derivations',
  'derivation-calgary': 'Derivations',
  'derivation-hurley': 'Derivations',
  'evaluate-truth': 'Evaluate truth',
  'valid-correct-sound': 'Validity and soundness',
}

function problemTypeLabel(type) {
  const normalizedType = type || 'derivation'
  if (problemTypeLabels[normalizedType]) return problemTypeLabels[normalizedType]
  return normalizedType
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
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
  policySummary = [],
  isOverdue,
  isAssignmentLocked = true,
  isInstructorView = false,
  onQuestionSaved,
  onQuestionCreated,
  assignmentId,
  logicSystem,
  groupQuestionsByType = false,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isPhone = useMediaQuery(theme.breakpoints.down('sm')) // fullscreen layout only on phones
  const desktopStickyTop = 0
  const desktopSidebarMaxHeight = `min(calc(100dvh - ${theme.spacing(8)}), 650px)`
  const proofRefs = React.useRef({})
  const [direction, setDirection] = React.useState('forward')
  const prevIndexRef = React.useRef(currentProofIndex)
  // lift fullscreen so Next keeps fullscreen and shows next question in fullscreen
  const [fullScreenOpen, setFullScreenOpen] = React.useState(false)
  const [fullScreenFocusTarget, setFullScreenFocusTarget] = React.useState(null)

  const [createAnchorEl, setCreateAnchorEl] = React.useState(null)
  const [createProof, setCreateProof] = React.useState(null)
  const createEditorRef = React.useRef(null)
  const pendingCreateOpenRef = React.useRef(false)

  const nextOrderIndex = React.useMemo(() => {
    if (!proofs?.length) return 0
    const maxIndex = proofs.reduce((max, proof) => {
      const v = Number(proof.orderIndex)
      return Number.isFinite(v) ? Math.max(max, v) : max
    }, -1)
    return maxIndex >= 0 ? maxIndex + 1 : proofs.length
  }, [proofs])

  const buildEmptyProof = React.useCallback((type) => {
    const base = {
      type,
      description: '',
      attemptLimit: 3,
      questionSnapshot: {},
    }
    if (type === 'multiple-choice') {
      return {
        ...base,
        multipleChoice: { prompt: '', choices: ['', ''] },
        answer: 0,
      }
    }
    if (type === 'truth-table') {
      return {
        ...base,
        truthTable: { kind: 'formula', statement: '', options: {} },
      }
    }
    if (type === 'indirect-truth-table') {
      return {
        ...base,
        indirectTruthTable: {
          prompt: '',
          argument: { premises: [], conclusion: '' },
          questions: [{ prompt: '', choices: [''], answerIndex: 0 }],
        },
      }
    }
    if (type === 'nonclassical-truth-table') {
      return {
        ...base,
        nonclassicalTruthTable: {
          prompt: '',
          argument: { premises: [], conclusion: '' },
          questions: [{ prompt: '', choices: [''], answerIndex: 0 }],
          truthValueToggle: ['T', 'F', 'N'],
        },
      }
    }
    if (isDerivationProblemType(type)) {
      return {
        ...base,
        premises: [],
        conclusion: '',
      }
    }
    if (type === 'evaluate-truth') {
      return {
        ...base,
        evaluateTruth: '',
        answer: false,
      }
    }
    if (type === 'symbolic-translation') {
      return {
        ...base,
        translation: { prompt: '', legend: '', symbolizationKey: [] },
        answer: '',
      }
    }
    if (type === 'single-row-truth-table') {
      return {
        ...base,
        singleRowTruthTable: { statement: '', interpretation: {}, prompt: '' },
      }
    }
    if (type === 'partial-truth-table') {
      return {
        ...base,
        partialTruthTable: { statement: '', row: [] },
      }
    }
    if (type === 'combo-translation-truth-table') {
      return {
        ...base,
        comboTranslationTruthTable: { prompt: '' },
        answer: '',
      }
    }
    if (type === 'combo-translation-derivation') {
      return {
        ...base,
        comboTranslationDerivation: { prompt: '' },
        answer: '',
      }
    }
    if (type === 'proof-argument-extraction') {
      return {
        ...base,
        premises: [''],
        lines: [''],
      }
    }
    return base
  }, [])

  const handleCreateMenuOpen = (event) => {
    setCreateAnchorEl(event.currentTarget)
  }

  const handleCreateMenuClose = () => {
    setCreateAnchorEl(null)
  }

  const handleCreateStart = (type) => {
    setCreateProof(buildEmptyProof(type))
    pendingCreateOpenRef.current = true
    setCreateAnchorEl(null)
  }

  React.useEffect(() => {
    if (!pendingCreateOpenRef.current || !createProof) return
    pendingCreateOpenRef.current = false
    createEditorRef.current?.open?.()
  }, [createProof])
  
  const handleTabChange = (e, newValue) => {
    const currentProof = proofs[currentProofIndex]
    if (currentProof) {
      const proofEditorRef = proofRefs.current[currentProof.id]
      if (proofEditorRef) {
        const derivationProblemType = currentProof.type === 'derivation-hurley'
          ? 'derivation-hurley'
          : getDerivationProblemType(currentProof.logicSystem)
        const derivEl = proofEditorRef.querySelector(derivationProblemType)
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
        position: { xs: 'static', md: 'sticky' },
        top: { xs: 'auto', md: desktopStickyTop },
        alignSelf: { xs: 'stretch', md: 'flex-start' },
        maxHeight: { xs: 'none', md: desktopSidebarMaxHeight },
        overflow: { xs: 'visible', md: 'hidden' },
      }}>
        <Tabs
          orientation={isMobile ? 'horizontal' : 'vertical'}
          variant="scrollable"
          scrollButtons={isMobile ? 'auto' : false}
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
            flex: { xs: '0 0 auto', md: '1 1 auto' },
            minHeight: 0,
            overflow: 'hidden',
            '& .MuiTabs-scroller': {
              overflowY: { xs: 'visible', md: 'auto !important' },
              overflowX: { xs: 'auto !important', md: 'hidden !important' },
            },
            '& .MuiTab-root': {
              color: 'primary.main',
              transition: 'all 0.2s ease',
              minWidth: { xs: 'auto', md: 200 },
              fontSize: { xs: '0.875rem', md: '1rem' },
              textTransform: 'none',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'rgba(47, 107, 255, 0.08)',
              },
            },
            '& .MuiTab-root.Mui-selected': {
              color: 'primary.main',
              fontWeight: 600,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
            },
          }}
        >
          {proofs.map((proof, idx) => {
            const totalQuestions = proofs.length
            const pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0
            const maxLabel = pointsPerQuestion % 1 === 0
              ? String(Math.round(pointsPerQuestion))
              : pointsPerQuestion.toFixed(1)
            const sectionLabel = problemTypeLabel(proof.type)
            const startsSection = groupQuestionsByType
              && (idx === 0 || problemTypeLabel(proofs[idx - 1]?.type) !== sectionLabel)
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
                  {startsSection && (
                    <Box
                      component="span"
                      sx={{
                        alignSelf: 'stretch',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        lineHeight: 1.4,
                        mb: 0.5,
                        pb: 0.5,
                        textAlign: 'left',
                        textTransform: 'uppercase',
                      }}
                    >
                      {sectionLabel}
                    </Box>
                  )}
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
                  color: 'primary.main',
                  '& span': {
                    color: 'primary.main',
                  },
                },
                '&.Mui-selected': {
                  color: 'primary.main',
                  '& span': {
                    color: 'primary.main',
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
            {isInstructorView && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 1, px: 1 }}>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  variant="text"
                  onClick={handleCreateMenuOpen}
                  disabled={!assignmentId}
                  sx={{
                    width: 160,
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 400,
                    color: 'primary.main',
                    '&:hover': { backgroundColor: 'rgba(47, 107, 255, 0.08)' },
                  }}
                >
                  Add question
                </Button>
                <Menu
                  anchorEl={createAnchorEl}
                  open={Boolean(createAnchorEl)}
                  onClose={handleCreateMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                >
                  {instructorProblemTypes.map(({ type, label }) => (
                    <MenuItem key={type} onClick={() => handleCreateStart(type)}>{label}</MenuItem>
                  ))}
                </Menu>
                {createProof && (
                  <InstructorQuestionEditor
                    ref={createEditorRef}
                    proof={createProof}
                    isInstructorView
                    trigger="none"
                    mode="create"
                    assignmentId={assignmentId}
                    orderIndex={nextOrderIndex}
                    logicSystem={logicSystem}
                    onCreated={(created) => {
                      onQuestionCreated?.(assignmentId, created)
                      setCreateProof(null)
                    }}
                  />
                )}
              </Box>
            )}
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
                <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 16 }} />
              )}
            </Box>
            {!isInstructorView && policySummary.length > 0 && (
              <Box sx={{
                px: 3,
                pb: 1.5,
                color: 'text.secondary',
                fontSize: '0.8rem',
                textAlign: 'right',
                minWidth: { xs: 'auto', md: 200 },
                width: '100%',
              }}>
                {policySummary.map((line) => (
                  <div key={line.label}>
                    {line.value ? (
                      <>
                        <div>{line.label}:</div>
                        <div>{line.value}</div>
                      </>
                    ) : (
                      <div>{line.label}</div>
                    )}
                  </div>
                ))}
              </Box>
            )}
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
          const isFirst = idx === 0
          const isLast = idx >= proofs.length - 1
          const handlePrev = isFirst ? null : () => handleTabChange(null, idx - 1)
          const handleNext = isLast ? null : () => handleTabChange(null, idx + 1)
          const problemLabel = `Problem ${idx + 1}`
          return (
            <ProblemNavigationContext.Provider
              key={proof.id}
              value={{
                onPrev: handlePrev,
                onNext: handleNext,
              }}
            >
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
                        // the proof carries the course system
                        const logicSystem = proof.logicSystem
                        const isDerivation = !proof.type || isDerivationProblemType(proof.type)
                        const shouldAttachAttempts = !isDerivation && proof.type
                        const savedStateWithAttempts = shouldAttachAttempts
                          ? { ...(savedState || {}), attemptCount: proof.attemptCount ?? 0 }
                          : savedState

                        if (proof.type === 'truth-table') {
                          return (
                            <TruthTableEditor
                              proof={proof}
                              problemLabel={problemLabel}
                              savedState={savedStateWithAttempts}
                              onStateChange={(state) => handleProofStateChange(proof.id, state, {
                                assignmentQuestionId: proof.questionId
                              })}
                              onProofComplete={onProofComplete}
                              isAssignmentLocked={isAssignmentLocked}
                              isInstructorView={isInstructorView}
                              onQuestionSaved={onQuestionSaved}
                              logicSystem={logicSystem}
                            />
                          )
                        }

                        if (isDerivation) {
                          // only worksheets 14-16 and practice set (17) use derivation
                          // default to derivation if type is not specified (backwards compatibility)
                          const derivationQuestionKey = JSON.stringify({
                            premises: proof.premises || [],
                            conclusion: proof.conclusion || '',
                          })
                          return (
                            <ProofEditor
                              key={`proof-${proof.id}-${derivationQuestionKey}`}
                              proof={proof}
                              problemLabel={problemLabel}
                              onProofComplete={onProofComplete}
                              savedState={savedStateWithAttempts}
                              onStateChange={(state, options = {}) => handleProofStateChange(proof.id, state, {
                                assignmentQuestionId: proof.questionId,
                                immediate: Boolean(options.immediate),
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
                              logicSystem={logicSystem}
                            />
                          )
                        }

                        return (
                          <LogicPenguinProblem
                            key={`proof-${proof.id}`}
                            proof={proof}
                            problemLabel={problemLabel}
                            onProofComplete={onProofComplete}
                            savedState={savedStateWithAttempts}
                            onStateChange={(state) => handleProofStateChange(proof.id, state, {
                              assignmentQuestionId: proof.questionId
                            })}
                            isAssignmentLocked={isAssignmentLocked}
                            isInstructorView={isInstructorView}
                            onQuestionSaved={onQuestionSaved}
                            logicSystem={logicSystem}
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
