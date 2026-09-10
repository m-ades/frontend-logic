import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import { useAppRuntime } from '../../../hooks/useAppRuntime.js'
import { fetchJson } from '../../../utils/api.js'
import { formatEasternFromIso } from '../../../utils/easternTime.js'
import SubmissionAnswer from './SubmissionAnswer.jsx'

/*
shows saved attempts for one student and assignment without editing or saving
mount for a selected student and unmount on close to reset question selection
requests stay scoped to that selection and failures offer a retry
demo submissions have no saved answers and make no api requests
*/
export default function StudentSubmissionDialog({ student, assignment, onClose }) {
  const { isSandbox, courseState } = useAppRuntime()
  const course = courseState.courses.find((item) => item.id === courseState.activeCourseId)
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
  const questions = data?.questions || []
  const question = questions[questionIndex]
  const attempts = (data?.submissions || [])
    .filter((submission) => String(submission.assignment_question_id) === String(question?.id))
    .sort((a, b) => b.attempt - a.attempt)
  const attempt = attempts.find((submission) => submission.id === attemptId) || attempts[0]

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="student-submission-title">
      <DialogTitle id="student-submission-title">
        {student.username} · {assignment.name}
      </DialogTitle>
      <DialogContent dividers>
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
    </Dialog>
  )
}
