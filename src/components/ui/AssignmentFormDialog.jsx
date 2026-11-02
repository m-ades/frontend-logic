import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { toEasternIso } from "../../utils/easternTime.js";
import { buildPublicationPayload } from "../../utils/publicationPolicy.js";
import { getOutlineTerms } from "../../utils/chapterLabels.js";
import { useActiveLogicSystem } from "../../hooks/useActiveLogicSystem.js";

export default function AssignmentFormDialog({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  mode = "create",
  type = "assignment",
  isSubmitting = false,
}) {
  const isPractice = type === "practice";
  const outlineTerms = getOutlineTerms(useActiveLogicSystem());
  const isCreate = mode === "create";
  const hasPublishDate = Boolean(formData.publishDate);
  const publication = hasPublishDate ? buildPublicationPayload(formData) : null;
  const publishTimeError = !hasPublishDate
    ? undefined
    : !publication
    ? "Choose an unambiguous New York time"
    : !publication.is_locked
    ? "This time has already passed"
    : undefined;
  const hasValidPublishTime = !publishTimeError;
  const hasValidDueTime = !formData.dueDate || Boolean(toEasternIso(
    formData.dueDate,
    formData.dueTime || "23:59"
  ));
  const title = isCreate
    ? isPractice
      ? "Create New Practice Assignment"
      : "Create New Assignment"
    : isPractice
    ? "Edit Practice Assignment"
    : "Edit Assignment";

  const buttonText = isCreate
    ? isPractice
      ? "Create Practice"
      : "Create Assignment"
    : "Save Changes";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label={isPractice ? "Practice Name" : "Assignment Name"}
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={
              isPractice
                ? "e.g., Chapter 3 Practice Problems"
                : "e.g., Homework 5"
            }
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label={outlineTerms.chapter}
              type="number"
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              value={formData.chapter}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  chapter: e.target.value,
                })
              }
              onWheel={(e) => e.target.blur()}
            />
            <TextField
              label={outlineTerms.subchapter}
              fullWidth
              value={formData.subchapter}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subchapter: e.target.value,
                })
              }
            />
          </Stack>

          {!isPractice && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Due Date & Time
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Time (New York)"
                  type="time"
                  fullWidth
                  value={formData.dueTime || "23:59"}
                  error={!hasValidDueTime}
                  helperText={!hasValidDueTime ? "Choose an unambiguous New York time" : undefined}
                  onChange={(e) =>
                    setFormData({ ...formData, dueTime: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>
          )}

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Presentation
            </Typography>
            <FormControlLabel
              sx={{ ml: 0 }}
              control={
                <Switch
                  checked={formData.groupQuestionsByType ?? false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      groupQuestionsByType: e.target.checked,
                    })
                  }
                />
              }
              label="Group questions by type"
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={formData.isLocked}
                onChange={(e) => setFormData({
                  ...formData,
                  isLocked: e.target.checked,
                  publishDate: "",
                  publishTime: "00:00",
                })}
              />
            }
            label="Lock assignment"
          />
          {formData.isLocked && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Scheduled Publication (Optional)
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  value={formData.publishDate || ""}
                  onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Time (New York)"
                  type="time"
                  fullWidth
                  value={formData.publishTime || "00:00"}
                  error={Boolean(publishTimeError)}
                  helperText={publishTimeError}
                  onChange={(e) => setFormData({ ...formData, publishTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={
            isSubmitting ||
            !hasValidPublishTime ||
            !hasValidDueTime ||
            !formData.name ||
            !Number.isInteger(Number(formData.chapter)) ||
            Number(formData.chapter) < 1 ||
            !formData.subchapter ||
            (!isPractice && (!formData.dueDate || !formData.dueTime))
          }
        >
          {isSubmitting ? "Saving..." : buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
