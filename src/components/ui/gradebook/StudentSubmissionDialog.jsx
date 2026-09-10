import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, MenuItem, Popover, Stack, TextField, Typography,
} from '@mui/material'
import { useAppRuntime } from '../../../hooks/useAppRuntime.js'
import { fetchJson } from '../../../utils/api.js'
import { formatEasternFromIso, splitEasternDateTime, toEasternIso } from '../../../utils/easternTime.js'
import SubmissionAnswer from './SubmissionAnswer.jsx'

/*
shows saved attempts and edits the selected student assignment extension
mount for a selected student and unmount on close to reset question selection
extension editing waits for the saved deadline and uses new york wall time
invalid or ambiguous dates stay in the form with an error and are never saved
requests stay scoped to that selection and failures offer a retry
demo submissions have no saved answers and make no api requests
*/
export default function StudentSubmissionDialog({ student, assignment, onClose }) {
  const { isSandbox, courseState, courseActions } = useAppRuntime()
  const { activeCourseId } = courseState
  const course = courseState.courses.find((item) => item.id === activeCourseId)
  const queryClient = useQueryClient()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [attemptId, setAttemptId] = useState(null)
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['student-submission', assignment.id, student.id],
    enabled: !isSandbox,
    retry: false,
    queryFn: async ({ signal }) => {
      const [questions, submissions] = await Promise.all([
        fetchJson(`/api/assignments/${assignment.id}/questions`, { signal }),
        fetchJson(`/api/instructor/assignments/${assignment.id}/submissions?userId=${student.id}`, { signal }),
      ])
      return {
        questions: [...questions].sort((a, b) => a.order_index - b.order_index),
        submissions: submissions.filter((submission) => String(submission.user_id) === String(student.id)),
      }
    },
  })

  const deadlineQueryKey = ['student-deadline', activeCourseId, student.id]
  const { data: deadlines, isFetching: deadlinesFetching, isPending: deadlinesPending, isError: deadlinesError, refetch: refetchDeadlines } = useQuery({
    queryKey: deadlineQueryKey,
    enabled: !isSandbox,
    queryFn: () => courseActions.getDeadlines?.(activeCourseId, student.id),
  })
  const deadlinePolicy = (deadlines || []).find((row) => row.assignment_id === assignment.id) || null
  const extensionLabel = (() => {
    if (!deadlinePolicy?.extension_due_at || !assignment.dueDate) return null
    const originalTs = Date.parse(toEasternIso(assignment.dueDate, assignment.dueTime || '23:59'))
    const extendedTs = Date.parse(deadlinePolicy.extension_due_at)
    if (!Number.isFinite(originalTs) || !Number.isFinite(extendedTs)) return null
    if (Math.abs(extendedTs - originalTs) < 1000) return null
    return formatEasternFromIso(deadlinePolicy.extension_due_at, { includeTime: true })
  })()

  const [extensionAnchorEl, setExtensionAnchorEl] = useState(null)
  const [extensionDate, setExtensionDate] = useState('')
  const [extensionTime, setExtensionTime] = useState('23:59')
  const [extensionSaving, setExtensionSaving] = useState(false)
  const [extensionError, setExtensionError] = useState('')

  const handleOpenExtension = (event) => {
    setExtensionError('')
    const currentDue = splitEasternDateTime(deadlinePolicy?.extension_due_at)
    setExtensionDate(currentDue.date ?? assignment.dueDate ?? '')
    setExtensionTime(currentDue.time ?? assignment.dueTime ?? '23:59')
    setExtensionAnchorEl(event.currentTarget)
  }

  const handleCloseExtension = () => {
    setExtensionAnchorEl(null)
  }

  const handleSaveExtension = async () => {
    setExtensionError('')
    const iso = extensionTime ? toEasternIso(extensionDate, extensionTime) : null
    if (!iso) {
      setExtensionError('Choose an unambiguous New York date and time.')
      return
    }
    setExtensionSaving(true)
    try {
      await courseActions.saveDeadline?.(activeCourseId, assignment.id, student.id, iso)
      await queryClient.invalidateQueries({ queryKey: deadlineQueryKey })
      setExtensionAnchorEl(null)
    } catch (err) {
      setExtensionError('Failed to save extension.')
    } finally {
      setExtensionSaving(false)
    }
  }
  const questions = data?.questions || []
  const question = questions[questionIndex]
  const attempts = (data?.submissions || [])
    .filter((submission) => String(submission.assignment_question_id) === String(question?.id))
    .sort((a, b) => b.attempt - a.attempt)
  const attempt = attempts.find((submission) => submission.id === attemptId) || attempts[0]

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="student-submission-title">
      <DialogTitle id="student-submission-title">
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            {student.username} · {assignment.name}
            {extensionLabel && (
              <Typography variant="caption" color="text.secondary" display="block">
                Extension: {extensionLabel}
              </Typography>
            )}
          </Box>
          {!isSandbox && (
            <Button size="small" onClick={handleOpenExtension} disabled={deadlinesPending || deadlinesFetching || deadlinesError || extensionSaving}>Give Extension</Button>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {!isSandbox && deadlinesError && (
          <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => refetchDeadlines()} disabled={deadlinesFetching}>Retry</Button>}>
            Could not load the current deadline.
          </Alert>
        )}
        {isSandbox ? (
          <Typography color="text.secondary">Submission details are unavailable in the demo.</Typography>
        ) : isPending ? (
          <LinearProgress aria-label="Loading submission" />
        ) : isError ? (
          <Alert severity="error" action={<Button color="inherit" onClick={() => refetch()} disabled={isFetching}>Retry</Button>}>
            Could not load submission.
          </Alert>
        ) : !data.submissions.length ? (
          <Typography color="text.secondary">No submission available.</Typography>
        ) : (
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <TextField
                select
                label="Question"
                size="small"
                value={questionIndex}
                onChange={(event) => {
                  setQuestionIndex(Number(event.target.value))
                  setAttemptId(null)
                }}
                sx={{ minWidth: 140 }}
              >
                {questions.map((item, index) => <MenuItem key={item.id} value={index}>Question {index + 1}</MenuItem>)}
              </TextField>
              {attempt && (
                <>
                  <TextField
                    select
                    label="Attempt"
                    size="small"
                    value={attempt.id}
                    onChange={(event) => setAttemptId(event.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    {attempts.map((item) => <MenuItem key={item.id} value={item.id}>Attempt {item.attempt}</MenuItem>)}
                  </TextField>
                  <Box sx={{ alignSelf: 'center' }}>
                    <Typography variant="body2">
                      Score: {attempt.score ?? '—'} / 100 · {attempt.is_correct ? 'Correct' : attempt.score > 0 ? 'Partially correct' : 'Incorrect'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatEasternFromIso(attempt.submitted_at) ?? '—'}{attempt.auto_submitted ? ' · Auto-submitted' : ''}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
            <SubmissionAnswer key={attempt?.id ?? question?.id} snapshot={question?.question_snapshot} data={attempt?.submission_data} logicSystem={course?.logicSystem} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      <Popover
        open={Boolean(extensionAnchorEl)}
        anchorEl={extensionAnchorEl}
        onClose={handleCloseExtension}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, width: 320 } } }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>Extension</Typography>
            <Typography variant="caption" color="text.secondary">{assignment.name}</Typography>
          </Box>
          {extensionSaving && <LinearProgress />}
          {extensionError && <Alert severity="error">{extensionError}</Alert>}
          <TextField
            label="New Due Date"
            type="date"
            value={extensionDate}
            onChange={(e) => setExtensionDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="New Due Time"
            type="time"
            value={extensionTime}
            onChange={(e) => setExtensionTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleCloseExtension}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveExtension} disabled={extensionSaving}>
              Save Extension
            </Button>
          </Box>
        </Stack>
      </Popover>
    </Dialog>
  )
}
