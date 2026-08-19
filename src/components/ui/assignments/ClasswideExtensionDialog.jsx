import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const REASON_MAX_LENGTH = 500;

export default function ClasswideExtensionDialog({
  open,
  assignment,
  form,
  onChange,
  onClose,
  onSubmit,
  saving = false,
  error = "",
}) {
  const canSubmit = Boolean(form?.dueDate) && !saving;

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    if (!canSubmit) return;
    onSubmit?.();
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Classwide extension</DialogTitle>
        {saving && <LinearProgress />}
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {assignment?.name && (
              <Typography variant="body2" color="text.secondary">
                {assignment.name}
              </Typography>
            )}
            <Alert severity="warning">
              This sets the same extended due date for every enrolled student. Existing
              per-student extensions for this assignment will be overwritten.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Extended due date"
              type="date"
              value={form?.dueDate || ""}
              onChange={(e) => onChange({ dueDate: e.target.value })}
              fullWidth
              required
              disabled={saving}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Extended due time"
              type="time"
              value={form?.dueTime || "23:59"}
              onChange={(e) => onChange({ dueTime: e.target.value })}
              fullWidth
              disabled={saving}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Reason (optional)"
              value={form?.reason || ""}
              onChange={(e) => onChange({ reason: e.target.value.slice(0, REASON_MAX_LENGTH) })}
              fullWidth
              multiline
              minRows={2}
              disabled={saving}
              inputProps={{ maxLength: REASON_MAX_LENGTH }}
              helperText={`${(form?.reason || "").length}/${REASON_MAX_LENGTH}`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            Apply to class
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
