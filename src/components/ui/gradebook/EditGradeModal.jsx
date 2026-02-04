import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Paper,
  Stack,
  Divider,
  Chip,
  Alert,
  Tab,
  Tabs,
  useTheme,
} from "@mui/material";
import { X, Save, Trash2, Clock, Calendar, AlertCircle } from "lucide-react";
import { formatDate } from "../../../utils/formatting.js";
import { formatEasternFromIso } from "../../../utils/easternTime.js";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function EditGradeModal({
  open,
  onClose,
  student,
  assignment,
  currentGrade,
  onSave,
  onDelete,
}) {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [grade, setGrade] = useState(currentGrade ?? "");
  const [extensionDays, setExtensionDays] = useState(0);
  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  if (!student || !assignment) return null;

  const handleSave = () => {
    const gradeValue = parseFloat(grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      alert("Please enter a valid grade between 0 and 100");
      return;
    }

    onSave({
      studentId: student.id,
      assignmentId: assignment.id,
      grade: gradeValue,
      extensionDays,
      notes,
    });

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${student.username}'s grade for ${assignment.name}?`
      )
    ) {
      onDelete({
        studentId: student.id,
        assignmentId: assignment.id,
      });
      onClose();
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Edit Grade
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {student.username} • {assignment.name}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {showSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Grade saved successfully!
          </Alert>
        )}

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
        >
          <Tab label="Edit Grade" />
          <Tab label="Attempts" />
          <Tab label="Extension" />
        </Tabs>

        {/* Edit Grade Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                CURRENT GRADE
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                color="primary.main"
                mt={1}
              >
                {currentGrade !== undefined ? `${currentGrade}%` : "No Grade"}
              </Typography>
            </Paper>

            <TextField
              label="New Grade"
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              fullWidth
              inputProps={{ min: 0, max: 100, step: 0.5 }}
              helperText="Enter a grade between 0 and 100"
              autoFocus
            />

            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              placeholder="Add any notes about this grade change..."
            />

            <Box
              sx={{
                p: 2,
                backgroundColor: "info.lighter",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "info.light",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <AlertCircle
                  size={18}
                  color={theme.palette.primary.main}
                  style={{ marginTop: 2 }}
                />
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="info.main"
                  >
                    Assignment Details
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mt={0.5}
                  >
                    Due: {formatDate(assignment.dueDate) ?? "—"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Total Points: {assignment.totalPoints || 100}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Stack>
        </TabPanel>

        {/* Attempts Tab */}
        <TabPanel value={tabValue} index={1}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Clock size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary">
              No Attempts Available
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Student submission attempts will appear here
            </Typography>
          </Paper>
        </TabPanel>

        {/* Extension Tab */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                <Calendar
                  size={16}
                  style={{ verticalAlign: "middle", marginRight: 4 }}
                />
                Original Due Date:{" "}
                {formatDate(assignment.dueDate) ?? "—"}
              </Typography>
              {extensionDays > 0 && (
                <Typography
                  variant="body2"
                  color="success.main"
                  fontWeight={600}
                >
                  New Due Date:{" "}
                  {formatEasternFromIso(
                    new Date(
                      new Date(assignment.dueDate).getTime() +
                        extensionDays * 24 * 60 * 60 * 1000
                    ).toISOString(),
                    { includeTime: false }
                  ) ?? "—"}
                </Typography>
              )}
            </Box>

            <Divider />

            <TextField
              label="Extension Days"
              type="number"
              value={extensionDays}
              onChange={(e) =>
                setExtensionDays(Math.max(0, parseInt(e.target.value) || 0))
              }
              fullWidth
              inputProps={{ min: 0, max: 30 }}
              helperText="Number of additional days after the due date"
            />

            {extensionDays > 0 && (
              <Alert severity="info" icon={<Clock size={20} />}>
                This student will have {extensionDays} extra day
                {extensionDays !== 1 ? "s" : ""} to submit without penalty
              </Alert>
            )}

            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: "warning.lighter",
                border: "1px solid",
                borderColor: "warning.light",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Note: Extensions only affect late penalties. The grade must
                still be entered manually.
              </Typography>
            </Paper>
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          {currentGrade !== undefined ? (
            <Button
              startIcon={<Trash2 size={18} />}
              color="error"
              onClick={handleDelete}
            >
              Delete Grade
            </Button>
          ) : (
            <div />
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              startIcon={<Save size={18} />}
              onClick={handleSave}
            >
              Save Grade
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
