import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppRuntime } from "../../../hooks/useAppRuntime.js";
import QuestionAttemptOverridesTable from "./QuestionAttemptOverridesTable.jsx";

const REASON_MAX_LENGTH = 500;

export default function QuestionAttemptOverrideDialog({
  open,
  onClose,
  questionId,
  questionLabel = "",
  baseAttemptLimit = 3,
}) {
  const { courseState, courseActions } = useAppRuntime();
  const { activeCourseId, gradebookByCourse } = courseState;
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [extraAttempts, setExtraAttempts] = useState("1");
  const [reason, setReason] = useState("");
  const savedTimerRef = useRef(null);

  // matches StudentSubmissionDialog's query key
  const overridesQueryKey = ["question-attempt-overrides", questionId];
  const {
    data: overridesData,
    isPending: overridesPending,
    isFetching: overridesFetching,
    isError: overridesError,
    refetch: refetchOverrides,
  } = useQuery({
    queryKey: overridesQueryKey,
    enabled: open && Boolean(questionId),
    queryFn: () => courseActions.getQuestionAttemptOverrides?.(questionId),
  });
  const overrides = Array.isArray(overridesData) ? overridesData : [];

  const students = useMemo(
    () => (gradebookByCourse?.[activeCourseId] || []).filter(
      (student) => String(student.role || "student").toLowerCase() !== "ta"
    ),
    [gradebookByCourse, activeCourseId]
  );

  const baseLimit = Number.isFinite(Number(baseAttemptLimit)) ? Number(baseAttemptLimit) : 3;
  const parsedExtra = Number(extraAttempts);
  const isValidExtra = Number.isInteger(parsedExtra) && parsedExtra >= 0;
  const effectiveLimit = isValidExtra ? Math.max(1, baseLimit + parsedExtra) : baseLimit;
  const overridesReady = !overridesPending && !overridesFetching && !overridesError;
  const canSubmit = Boolean(studentId) && isValidExtra && !saving && overridesReady;

  useEffect(() => {
    if (!open) {
      setStudentId("");
      setExtraAttempts("1");
      setReason("");
      setError("");
      setSaved(false);
    }
  }, [open]);

  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  useEffect(() => {
    if (!studentId) return;
    const existing = overrides.find((row) => String(row.user_id) === String(studentId));
    if (existing) {
      setExtraAttempts(String(existing.extra_attempts ?? existing.extraAttempts ?? 0));
      setReason(existing.reason || "");
      return;
    }
    setExtraAttempts("1");
    setReason("");
  }, [studentId, overrides]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!canSubmit || !questionId) return;

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await courseActions.saveQuestionAttemptOverride?.(questionId, {
        userId: Number(studentId),
        extraAttempts: parsedExtra,
        reason,
      });
      await queryClient.invalidateQueries({ queryKey: overridesQueryKey });
      setSaved(true);
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err?.message || "Failed to save extra attempts.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Extra attempts</DialogTitle>
        {(overridesPending || overridesFetching || saving) && <LinearProgress />}
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {questionLabel && (
              <Typography variant="body2" color="text.secondary">
                {questionLabel}
              </Typography>
            )}
            <Alert severity="info">
              Extra attempts are added to this question&apos;s base limit ({baseLimit}).
              Setting 0 removes the bonus and restores the base limit only.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            {saved && <Alert severity="success">Extra attempts saved.</Alert>}
            {overridesError && (
              <Alert
                severity="error"
                action={(
                  <Button color="inherit" onClick={() => refetchOverrides()} disabled={overridesFetching}>
                    Retry
                  </Button>
                )}
              >
                Failed to load extra attempts for this question.
              </Alert>
            )}

            <FormControl fullWidth required disabled={saving || !overridesReady || students.length === 0}>
              <InputLabel id="attempt-override-student-label">Student</InputLabel>
              <Select
                labelId="attempt-override-student-label"
                label="Student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                {students.map((student) => (
                  <MenuItem key={student.id} value={String(student.id)}>
                    {student.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Extra attempts"
              type="number"
              value={extraAttempts}
              onChange={(event) => setExtraAttempts(event.target.value)}
              inputProps={{ min: 0, step: 1 }}
              helperText={isValidExtra ? `Effective attempt limit: ${effectiveLimit}` : "Whole number, 0 or more"}
              error={!isValidExtra}
              fullWidth
              required
              disabled={saving}
            />

            <TextField
              label="Reason (optional)"
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, REASON_MAX_LENGTH))}
              fullWidth
              multiline
              minRows={2}
              disabled={saving}
              inputProps={{ maxLength: REASON_MAX_LENGTH }}
              helperText={`${reason.length}/${REASON_MAX_LENGTH}`}
            />

            <Typography variant="subtitle2" fontWeight={600}>
              Current overrides
            </Typography>
            <QuestionAttemptOverridesTable
              rows={overrides}
              baseAttemptLimit={baseLimit}
              loading={overridesPending}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
