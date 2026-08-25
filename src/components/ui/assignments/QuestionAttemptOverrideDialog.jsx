import { useEffect, useMemo, useState } from "react";
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

  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [extraAttempts, setExtraAttempts] = useState("1");
  const [reason, setReason] = useState("");

  const students = useMemo(
    () => (gradebookByCourse?.[activeCourseId] || []).filter(
      (student) => String(student.role || "student").toLowerCase() !== "ta"
    ),
    [gradebookByCourse, activeCourseId]
  );

  const baseLimit = Number.isFinite(Number(baseAttemptLimit)) ? Number(baseAttemptLimit) : 3;
  const parsedExtra = Number(extraAttempts);
  const effectiveLimit = Number.isFinite(parsedExtra)
    ? Math.max(1, baseLimit + parsedExtra)
    : baseLimit;
  const canSubmit = Boolean(studentId) && Number.isFinite(parsedExtra) && parsedExtra >= 0 && !saving;

  useEffect(() => {
    if (!open || !questionId) return undefined;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setSaved(false);
      try {
        const rows = await courseActions.getQuestionAttemptOverrides?.(questionId);
        if (!isMounted) return;
        setOverrides(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (!isMounted) return;
        setOverrides([]);
        setError(err?.message || "Failed to load extra attempts.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [open, questionId, courseActions]);

  useEffect(() => {
    if (!open) {
      setStudentId("");
      setExtraAttempts("1");
      setReason("");
      setError("");
      setSaved(false);
    }
  }, [open]);

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
      const record = await courseActions.saveQuestionAttemptOverride?.(questionId, {
        userId: Number(studentId),
        extraAttempts: parsedExtra,
        reason,
      });
      const rows = await courseActions.getQuestionAttemptOverrides?.(questionId);
      setOverrides(Array.isArray(rows) ? rows : (record ? [record] : []));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
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
        {(loading || saving) && <LinearProgress />}
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

            <FormControl fullWidth required disabled={saving || students.length === 0}>
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
              helperText={`Effective attempt limit: ${effectiveLimit}`}
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
              loading={loading}
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
