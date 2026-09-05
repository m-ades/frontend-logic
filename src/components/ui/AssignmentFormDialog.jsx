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
  const isCreate = mode === "create";
  const hasPublishDate = Boolean(formData.publishDate);
  const publication = hasPublishDate ? buildPublicationPayload(formData) : null;
  const hasValidPublishTime = !hasPublishDate || publication !== null;
  const hasFutureSchedule = publication?.is_locked === true;
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
              label="Chapter"
              type="number"
              fullWidth
              value={formData.chapter}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  chapter: parseInt(e.target.value) || 1,
                })
              }
            />
            <TextField
              label="Subchapter"
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

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Scheduled publication
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Date"
                type="date"
                fullWidth
                value={formData.publishDate || ""}
                onChange={(e) => {
                  const publishDate = e.target.value;
                  const publishTime = formData.publishTime || "00:00";
                  const nextPublication = publishDate
                    ? buildPublicationPayload({ publishDate, publishTime })
                    : null;
                  setFormData({
                    ...formData,
                    publishDate,
                    ...(nextPublication ? { isLocked: nextPublication.is_locked } : {}),
                  });
                }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Time"
                type="time"
                fullWidth
                value={formData.publishTime || "00:00"}
                error={!hasValidPublishTime}
                helperText={!hasValidPublishTime ? "Choose an unambiguous New York time" : undefined}
                onChange={(e) => {
                  const publishTime = e.target.value;
                  const nextPublication = formData.publishDate
                    ? buildPublicationPayload({ publishDate: formData.publishDate, publishTime })
                    : null;
                  setFormData({
                    ...formData,
                    publishTime,
                    ...(nextPublication ? { isLocked: nextPublication.is_locked } : {}),
                  });
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              Optional New York time
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {isPractice ? "Due Date & Time (Optional)" : "Due Date & Time"}
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
                label="Time"
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
            {isPractice && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                Practice assignments can be completed after due date
              </Typography>
            )}
          </Box>

          {isPractice && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowRetakes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowRetakes: e.target.checked,
                      })
                    }
                  />
                }
                label="Allow unlimited retakes"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.showSolutions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        showSolutions: e.target.checked,
                      })
                    }
                  />
                }
                label="Show solutions after completion"
              />
            </>
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
                disabled={hasFutureSchedule}
                onChange={(e) => {
                  const isLocked = e.target.checked;
                  setFormData({
                    ...formData,
                    isLocked,
                    ...(isLocked ? { publishDate: "", publishTime: "00:00" } : {}),
                  });
                }}
              />
            }
            label="Lock assignment"
          />
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
            !formData.chapter ||
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
