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

export default function AssignmentFormDialog({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  mode = "create",
  type = "assignment",
}) {
  const isPractice = type === "practice";
  const isCreate = mode === "create";

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
            required
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
              required
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
              required
            />
          </Stack>

          <TextField
            label="Total Points"
            type="number"
            fullWidth
            value={formData.totalPoints}
            onChange={(e) =>
              setFormData({
                ...formData,
                totalPoints: parseInt(e.target.value) || 0,
              })
            }
            required
          />

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Publish Date & Time
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Date"
                type="date"
                fullWidth
                value={formData.publishDate}
                onChange={(e) =>
                  setFormData({ ...formData, publishDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Time"
                type="time"
                fullWidth
                value={formData.publishTime || "00:00"}
                onChange={(e) =>
                  setFormData({ ...formData, publishTime: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Stack>
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
                required={!isPractice}
              />
              <TextField
                label="Time"
                type="time"
                fullWidth
                value={formData.dueTime || "23:59"}
                onChange={(e) =>
                  setFormData({ ...formData, dueTime: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required={!isPractice}
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

          <FormControlLabel
            control={
              <Switch
                checked={formData.isPublished}
                onChange={(e) =>
                  setFormData({ ...formData, isPublished: e.target.checked })
                }
              />
            }
            label={isCreate ? "Publish immediately" : "Published"}
          />

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

          <FormControlLabel
            control={
              <Switch
                checked={formData.isLocked}
                onChange={(e) =>
                  setFormData({ ...formData, isLocked: e.target.checked })
                }
              />
            }
            label={
              isPractice
                ? "Lock assignment (prevent access)"
                : "Lock assignment (prevent submissions)"
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={
            !formData.name ||
            !formData.chapter ||
            !formData.subchapter ||
            formData.totalPoints === null ||
            formData.totalPoints === undefined ||
            !formData.publishDate ||
            !formData.publishTime ||
            (!isPractice && (!formData.dueDate || !formData.dueTime))
          }
        >
          {buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
