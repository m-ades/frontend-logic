import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import LoadingSpinner from '@/components/ui/LoadingSpinner.jsx'
import WorksheetTabs from '@/components/problems/WorksheetTabs.jsx'
import { useProofState } from '@/hooks/useproofstate.js'
import { useScoring } from '@/hooks/usescoring.js'
import { useWorksheetMetrics } from '@/hooks/useWorksheetMetrics.js'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useCoursesState } from '@/context/CoursesContext.jsx'
import { DEFAULT_LOGIC_SYSTEM, normalizeLogicSystem } from '@/lib/logicSystems.js'
import { mapQuestionToProof } from '@/lib/mapQuestionToProof.js'
import { fetchJson, getActiveUserId } from '@/utils/api.js'

/**
 * Renders a practice problem set inline (no navigate-to-workspace hop).
 * textbook chapter practice pane
 */
export default function EmbeddedPracticePane({
  links = [],
  activePracticeId = null,
  onPracticeChange,
}) {
  const {
    isSandbox,
    isInstructor,
    sandbox,
    instructorSandbox,
  } = useAppRuntime()
  const { activeCourseId, courses } = useCoursesState()
  const activeCourse = useMemo(
    () => courses.find((course) => Number(course.id) === Number(activeCourseId)),
    [courses, activeCourseId],
  )
  const courseLogicSystem = normalizeLogicSystem(
    activeCourse?.logicSystem ?? activeCourse?.logic_system,
    DEFAULT_LOGIC_SYSTEM,
  )

  const practiceOptions = useMemo(
    () =>
      links.map((link) => ({
        id: link.practiceId,
        label: link.practiceTitle || String(link.practiceId),
      })),
    [links],
  )

  const selectedId = activePracticeId ?? practiceOptions[0]?.id ?? null
  const [currentProofIndex, setCurrentProofIndex] = useState(0)
  const [liveAssignment, setLiveAssignment] = useState(null)
  const [liveError, setLiveError] = useState(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const {
    getSavedProofState,
    handleProofStateChange,
    initializeSavedProofStates,
  } = useProofState()

  useEffect(() => {
    setCurrentProofIndex(0)
  }, [selectedId])

  const worksheetStore = isInstructor ? instructorSandbox : sandbox

  const sandboxAssignment = useMemo(() => {
    if (!isSandbox || selectedId == null) return null
    if (isInstructor) return worksheetStore?.getActivity?.(selectedId) || null
    return worksheetStore?.getAssignment?.(selectedId) || null
  }, [isSandbox, isInstructor, worksheetStore, selectedId])

  useEffect(() => {
    if (isSandbox || selectedId == null) {
      setLiveAssignment(null)
      setLiveError(null)
      setLiveLoading(false)
      return undefined
    }

    const controller = new AbortController()
    let cancelled = false

    async function load() {
      setLiveLoading(true)
      setLiveError(null)
      try {
        const userId = getActiveUserId()
        const [detail, drafts] = await Promise.all([
          fetchJson(
            `/api/assignments/${selectedId}?userId=${encodeURIComponent(userId || '')}`,
            { signal: controller.signal },
          ),
          fetchJson('/api/assignment-drafts', { signal: controller.signal })
            .catch((error) => {
              if (error?.name === 'AbortError') throw error
              return []
            }),
        ])
        if (cancelled) return

        const assignment = detail?.assignment || detail
        const questions = detail?.questions || []
        const proofs = questions.map((question, index) =>
          mapQuestionToProof(question, assignment, index, courseLogicSystem),
        )

        const proofIdByQuestionId = new Map(
          proofs.map((proof) => [String(proof.questionId), proof.id]),
        )
        const initialStates = {}
        for (const draft of drafts || []) {
          if (userId != null && String(draft.user_id) !== String(userId)) continue
          const proofId = proofIdByQuestionId.get(String(draft.assignment_question_id))
          if (proofId) initialStates[proofId] = draft.draft_data
        }
        initializeSavedProofStates(initialStates)

        setLiveAssignment({
          ...assignment,
          title: assignment.title || assignment.name,
          proofs,
        })
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return
        setLiveError(error?.message || 'Failed to load practice.')
        setLiveAssignment(null)
      } finally {
        if (!cancelled) setLiveLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isSandbox, selectedId])

  const assignment = isSandbox ? sandboxAssignment : liveAssignment

  const getQuestionState = isSandbox
    ? worksheetStore?.getQuestionState ?? (() => null)
    : getSavedProofState
  const isQuestionComplete = worksheetStore?.isQuestionComplete ?? (() => false)
  const updateQuestionState = isSandbox
    ? worksheetStore?.updateQuestionState ?? (() => undefined)
    : handleProofStateChange
  const markQuestionComplete = worksheetStore?.markQuestionComplete ?? (() => undefined)

  const worksheets = useMemo(
    () => (assignment ? [{ ...assignment, proofs: assignment.proofs || [] }] : []),
    [assignment],
  )
  const currentWorksheet = worksheets[0]
  const total = currentWorksheet?.proofs?.length || 0

  const {
    completedProofs,
    score,
    handleProofComplete,
    setCompletedProofs,
  } = useScoring(currentWorksheet)

  useEffect(() => {
    if (!currentWorksheet?.proofs || !isSandbox) return
    setCompletedProofs(
      new Set(
        currentWorksheet.proofs
          .filter((proof) => isQuestionComplete(proof.id))
          .map((proof) => proof.id),
      ),
    )
  }, [currentWorksheet?.proofs, isQuestionComplete, isSandbox, setCompletedProofs])

  const questionScores = useMemo(() => {
    if (!isSandbox) return {}
    const scores = {}
    for (const proof of currentWorksheet?.proofs || []) {
      const saved = getQuestionState(proof.id)
      const rawScore = Number(saved?.rawScore)
      if (Number.isFinite(rawScore)) {
        scores[proof.questionId] = rawScore
      } else if (saved?.lastStatus === 'incorrect') {
        scores[proof.questionId] = 0
      } else if (saved?.lastStatus === 'partial') {
        scores[proof.questionId] = 50
      } else if (isQuestionComplete(proof.id)) {
        scores[proof.questionId] = 100
      }
    }
    return scores
  }, [currentWorksheet?.proofs, getQuestionState, isQuestionComplete, isSandbox])

  const calculatedGradePercent = useMemo(() => {
    if (!total) return null
    return (score / total) * 100
  }, [score, total])

  const { completionPercent, gradeLabel } = useWorksheetMetrics({
    score,
    total,
    calculatedGradePercent,
    dueAt: currentWorksheet?.dueAt || currentWorksheet?.due_at,
  })

  if (!practiceOptions.length) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No practice linked to this chapter.</Alert>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>
          Practice
        </Typography>
        {practiceOptions.length > 1 ? (
          <FormControl size="small" fullWidth>
            <InputLabel id="embedded-practice-select-label">Problem set</InputLabel>
            <Select
              labelId="embedded-practice-select-label"
              label="Problem set"
              value={selectedId != null ? String(selectedId) : ''}
              onChange={(event) => onPracticeChange?.(event.target.value)}
              aria-label="Select linked practice set"
            >
              {practiceOptions.map((option) => (
                <MenuItem key={option.id} value={String(option.id)}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {practiceOptions[0]?.label}
          </Typography>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', p: 1.5 }}>
        {liveLoading && <LoadingSpinner label="Loading practice…" />}
        {liveError && <Alert severity="error">{liveError}</Alert>}
        {!liveLoading && !liveError && !currentWorksheet && (
          <Alert severity="warning">Practice set not found.</Alert>
        )}
        {currentWorksheet && (
          <WorksheetTabs
            worksheets={worksheets}
            currentWorksheetIndex={0}
            onWorksheetIndexChange={() => {}}
            currentProofIndex={currentProofIndex}
            onProofIndexChange={setCurrentProofIndex}
            completedProofs={completedProofs}
            questionScores={questionScores}
            onProofComplete={(proofId) => {
              handleProofComplete(proofId)
              if (isSandbox) markQuestionComplete(proofId)
            }}
            getSavedProofState={getQuestionState}
            handleProofStateChange={updateQuestionState}
            total={total}
            completionPercent={completionPercent}
            gradeLabel={gradeLabel}
          />
        )}
      </Box>
    </Box>
  )
}
