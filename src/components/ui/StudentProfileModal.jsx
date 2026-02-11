import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Grid,
  Paper,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  alpha,
  useTheme,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";
import {
  X,
  User,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useCoursesState } from "../../context/CoursesContext";
import {
  getLetterGrade,
  getGradeColorVariant,
  isPassingGrade,
  getDefaultGradingScale,
} from "../../utils/gradingUtils";
import { formatDate } from "../../utils/formatting.js";
import { formatEasternFromIso, formatEasternDateTime } from "../../utils/easternTime.js";
import { MetricCard } from "./MetricCard";
import { fetchJson } from "../../utils/api.js";

// Helper function to calculate average
function calculateAverage(grades) {
  const validGrades = Object.values(grades).filter(
    (g) => g !== undefined && g !== null && !isNaN(g)
  );
  if (validGrades.length === 0) return 0;
  return Math.round(
    validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
  );
}

function calculateTrend(grades, assignments) {
  if (assignments.length < 3) return null;

  const recentAssignments = assignments.slice(-3);
  const recentGrades = recentAssignments
    .map((a) => grades[a.id])
    .filter((g) => g !== undefined);

  if (recentGrades.length < 2) return null;

  const firstHalf = recentGrades.slice(0, Math.ceil(recentGrades.length / 2));
  const secondHalf = recentGrades.slice(Math.ceil(recentGrades.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "improving" : "declining";
}

export default function StudentProfileModal({
  open,
  onClose,
  student,
  assignments,
  canToggleRole = false,
  canEditAccommodations = false,
  onToggleRole,
}) {
  const theme = useTheme();
  const { courses, activeCourseId } = useCoursesState();
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();

  // pull any existing accommodations for this student
  const [accommodationLoading, setAccommodationLoading] = useState(false);
  const [accommodationError, setAccommodationError] = useState("");
  const [accommodationSaved, setAccommodationSaved] = useState(false);
  const [extraLateDays, setExtraLateDays] = useState(0);
  const [latePenaltyWaived, setLatePenaltyWaived] = useState(false);

  // per assignment override for just this student
  const [extensionAssignmentId, setExtensionAssignmentId] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionTime, setExtensionTime] = useState("23:59");
  const [extensionSaving, setExtensionSaving] = useState(false);
  const [extensionError, setExtensionError] = useState("");
  const [extensionSaved, setExtensionSaved] = useState(false);
  const [deadlineMap, setDeadlineMap] = useState({});

  const nonPracticeAssignments = useMemo(
    () => assignments.filter((a) => a.kind !== "practice"),
    [assignments]
  );

  // hydrate accommodations when the modal opens
  useEffect(() => {
    const courseId = Number(activeCourseId);
    if (!open || !student || !Number.isFinite(courseId) || !canEditAccommodations) return;
    let isMounted = true;
    const load = async () => {
      setAccommodationLoading(true);
      setAccommodationError("");
      try {
        const rows = await fetchJson(
          `/api/instructor/courses/${courseId}/accommodations`
        );
        if (!isMounted) return;
        const record = (rows || []).find((r) => r.user_id === student.id);
        setExtraLateDays(
          Number.isFinite(Number(record?.extra_late_days))
            ? Number(record.extra_late_days)
            : 0
        );
        setLatePenaltyWaived(Boolean(record?.late_penalty_waived));
      } catch (err) {
        if (!isMounted) return;
        setAccommodationError("Failed to load accommodations.");
      } finally {
        if (isMounted) setAccommodationLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [open, student, activeCourseId, canEditAccommodations]);

  useEffect(() => {
    const courseId = Number(activeCourseId);
    if (!open || !student || !Number.isFinite(courseId) || !canEditAccommodations) return;
    let isMounted = true;
    const load = async () => {
      try {
        const rows = await fetchJson(
          `/api/instructor/courses/${courseId}/deadlines/${student.id}`
        );
        if (!isMounted) return;
        const map = {};
        (rows || []).forEach((row) => {
          if (!row?.assignment_id) return;
          map[row.assignment_id] = row;
        });
        setDeadlineMap(map);
      } catch (err) {
        if (!isMounted) return;
        setDeadlineMap({});
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [open, student, activeCourseId, canEditAccommodations]);

  // default extension picker to the assignment due date
  useEffect(() => {
    if (!extensionAssignmentId) return;
    const assignment = nonPracticeAssignments.find(
      (a) => String(a.id) === String(extensionAssignmentId)
    );
    if (!assignment) return;
    setExtensionDate(assignment.dueDate || "");
    setExtensionTime(assignment.dueTime || "23:59");
  }, [extensionAssignmentId, nonPracticeAssignments]);

  // compose a single timestamp for the api
  const buildIsoDateTime = (date, time) => {
    if (!date) return null;
    const safeTime = time || "00:00";
    return new Date(`${date}T${safeTime}:00`).toISOString();
  };

  // store course level accommodations for this student
  const handleSaveAccommodation = async () => {
    const courseId = Number(activeCourseId);
    if (!Number.isFinite(courseId) || !student) return;
    setAccommodationSaved(false);
    setAccommodationError("");
    try {
      await fetchJson(`/api/instructor/courses/${courseId}/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: student.id,
          extra_late_days: Math.max(0, parseInt(extraLateDays, 10) || 0),
          late_penalty_waived: Boolean(latePenaltyWaived),
        }),
      });
      setAccommodationSaved(true);
      setTimeout(() => setAccommodationSaved(false), 1500);
    } catch (err) {
      setAccommodationError("Failed to save accommodations.");
    }
  };

  // store a per assignment due date override
  const handleSaveExtension = async () => {
    setExtensionError("");
    setExtensionSaved(false);
    const assignmentId = Number(extensionAssignmentId);
    if (!Number.isFinite(assignmentId)) {
      setExtensionError("Choose an assignment.");
      return;
    }
    const iso = buildIsoDateTime(extensionDate, extensionTime);
    if (!iso) {
      setExtensionError("Choose a valid date/time.");
      return;
    }
    setExtensionSaving(true);
    try {
      await fetchJson(
        `/api/instructor/assignments/${assignmentId}/extensions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: student.id,
            extended_due_date: iso,
          }),
        }
      );
      setExtensionSaved(true);
      setTimeout(() => setExtensionSaved(false), 1500);
    } catch (err) {
      setExtensionError("Failed to save extension.");
    } finally {
      setExtensionSaving(false);
    }
  };

  if (!student) return null;

  const roleLabel = student.role === "ta" ? "TA" : "Student";
  const handleRoleClick = () => {
    if (!canToggleRole || !onToggleRole) return;
    const newRole = student.role === "ta" ? "Student" : "TA";
    const message = `Are you sure you want to change ${student.username}'s role to ${newRole}?`;
    if (window.confirm(message)) {
      onToggleRole(student, newRole);
    }
  };

  const average = calculateAverage(student.grades);
  const letterGrade = getLetterGrade(average, gradingScale);
  const gradeColorVariant = getGradeColorVariant(average, gradingScale);

  // Calculate stats
  const totalAssignments = assignments.length;
  const completedAssignments = Object.keys(student.grades).length;
  const missingAssignments = totalAssignments - completedAssignments;
  const completionRate = Math.round(
    (completedAssignments / totalAssignments) * 100
  );

  // Grade distribution
  const gradeValues = Object.values(student.grades);
  const highestGrade = gradeValues.length > 0 ? Math.max(...gradeValues) : 0;
  const lowestGrade = gradeValues.length > 0 ? Math.min(...gradeValues) : 0;

  // Performance trend
  const trend = calculateTrend(student.grades, assignments);

  // Assignment details with grades
  const assignmentDetails = assignments.map((assignment) => ({
    ...assignment,
    studentGrade: student.grades[assignment.id],
    status:
      student.grades[assignment.id] !== undefined ? "completed" : "missing",
  }));

  const getEffectiveDueLabel = (assignment) => {
    const policy = deadlineMap?.[assignment.id];
    if (policy?.due_at) {
      return formatEasternFromIso(policy.due_at, { includeTime: true }) ?? "—";
    }
    if (assignment.dueDate) {
      return (
        formatEasternDateTime(assignment.dueDate, assignment.dueTime) ??
        formatDate(assignment.dueDate) ??
        "—"
      );
    }
    return "—";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {student.username}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 0.5,
                ...(canToggleRole && onToggleRole
                  ? {
                      cursor: "pointer",
                      "&:hover": { opacity: 0.85 },
                    }
                  : {}),
              }}
              onClick={canToggleRole && onToggleRole ? handleRoleClick : undefined}
              role={canToggleRole && onToggleRole ? "button" : undefined}
              aria-label={
                canToggleRole && onToggleRole
                  ? `Change role to ${student.role === "ta" ? "Student" : "TA"}`
                  : undefined
              }
            >
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  color: "text.secondary",
                }}
                aria-hidden
              >
                <User size={18} strokeWidth={2} />
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textTransform: "capitalize", fontWeight: 500 }}
              >
                {roleLabel}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Overall Grade Card */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.1
            )} 0%, ${alpha(theme.palette.secondary?.main || "#8b5cf6", 0.1)} 100%)`,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                OVERALL GRADE
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "baseline", gap: 2, mt: 1 }}
              >
                <Typography variant="h2" fontWeight={800} color="primary.main">
                  {average}%
                </Typography>
                <Chip
                  label={letterGrade}
                  color={gradeColorVariant}
                  sx={{ fontWeight: 700, fontSize: "1rem", height: 32 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Completion Rate
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {completionRate}% ({completedAssignments}/{totalAssignments}
                    )
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Highest Grade
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="success.main"
                  >
                    {highestGrade}%
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Lowest Grade
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="error.main"
                  >
                    {lowestGrade}%
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Stats Grid with MetricCard */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          <MetricCard
            title="Completed"
            value={completedAssignments}
            subtitle={`${completionRate}% of total`}
            icon={Award}
            gradient={["#10b981", "#059669"]}
          />
          <MetricCard
            title="Missing"
            value={missingAssignments}
            subtitle={
              missingAssignments === 0 ? "All done! 🎉" : "Assignments due"
            }
            icon={Clock}
            gradient={["#ef4444", "#dc2626"]}
          />
          <MetricCard
            title="Highest"
            value={`${highestGrade}%`}
            subtitle={getLetterGrade(highestGrade, gradingScale)}
            icon={TrendingUp}
            gradient={[theme.palette.primary.main, theme.palette.primary.dark]}
          />
          <MetricCard
            title="Lowest"
            value={`${lowestGrade}%`}
            subtitle={getLetterGrade(lowestGrade, gradingScale)}
            icon={TrendingDown}
            gradient={["#f59e0b", "#d97706"]}
          />
        </Box>

        {/* Performance Trend Card */}
        {trend && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {trend === "improving" && (
              <>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: alpha("#10b981", 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingUp size={24} color="#10b981" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    color="success.main"
                  >
                    Performance Improving
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recent grades show positive trend
                  </Typography>
                </Box>
              </>
            )}
            {trend === "declining" && (
              <>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: alpha("#ef4444", 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingDown size={24} color="#ef4444" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    color="error.main"
                  >
                    Performance Declining
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recent grades show downward trend
                  </Typography>
                </Box>
              </>
            )}
            {trend === "stable" && (
              <>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: alpha("#64748b", 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={24} color="#64748b" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    color="text.secondary"
                  >
                    Performance Stable
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Consistent performance across recent assignments
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        )}

        {canEditAccommodations && (
          <>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Accommodations
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Stack spacing={2}>
                {accommodationError && (
                  <Alert severity="error">{accommodationError}</Alert>
                )}
                {accommodationSaved && (
                  <Alert severity="success">Accommodations saved.</Alert>
                )}
                <TextField
                  label="Extra Late Days"
                  type="number"
                  value={extraLateDays}
                  onChange={(e) =>
                    setExtraLateDays(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  inputProps={{ min: 0, max: 365 }}
                  helperText="Extra days added to the late window for this student"
                  fullWidth
                  disabled={accommodationLoading}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={latePenaltyWaived}
                      onChange={(e) => setLatePenaltyWaived(e.target.checked)}
                      disabled={accommodationLoading}
                    />
                  }
                  label="Waive late penalty"
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveAccommodation}
                    disabled={accommodationLoading}
                  >
                    Save Accommodations
                  </Button>
                </Box>
              </Stack>
            </Paper>

            <Typography variant="h6" fontWeight={600} mb={2}>
              Assignment Extension
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Stack spacing={2}>
                {extensionError && <Alert severity="error">{extensionError}</Alert>}
                {extensionSaved && (
                  <Alert severity="success">Extension saved.</Alert>
                )}
                <TextField
                  label="Assignment"
                  select
                  SelectProps={{ native: true }}
                  value={extensionAssignmentId}
                  onChange={(e) => setExtensionAssignmentId(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                >
                  <option value="" disabled hidden />
                  {nonPracticeAssignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.name}
                    </option>
                  ))}
                </TextField>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
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
                </Box>
                <Typography variant="caption" color="text.secondary">
                  This overrides the due date/time for this student only.
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveExtension}
                    disabled={extensionSaving}
                  >
                    Save Extension
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </>
        )}

        {/* Assignment Details Table */}
        <Typography variant="h6" fontWeight={600} mb={2}>
          Assignment Details
        </Typography>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "background.paper",
                    }}
                  >
                    Assignment
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "background.paper",
                    }}
                  >
                    Due Date
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "background.paper",
                    }}
                  >
                    Grade
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "background.paper",
                    }}
                  >
                    Letter
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "background.paper",
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignmentDetails.map((assignment) => {
                  const assignmentLetterGrade =
                    assignment.studentGrade !== undefined
                      ? getLetterGrade(assignment.studentGrade, gradingScale)
                      : "—";
                  const assignmentColorVariant =
                    assignment.studentGrade !== undefined
                      ? getGradeColorVariant(
                          assignment.studentGrade,
                          gradingScale
                        )
                      : "default";
                  const isPassing =
                    assignment.studentGrade !== undefined
                      ? isPassingGrade(assignment.studentGrade, gradingScale)
                      : null;

                  return (
                    <TableRow key={assignment.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {assignment.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {getEffectiveDueLabel(assignment)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {assignment.studentGrade !== undefined ? (
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={isPassing ? "success.main" : "error.main"}
                          >
                            {assignment.studentGrade}%
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {assignment.studentGrade !== undefined ? (
                          <Chip
                            label={assignmentLetterGrade}
                            color={assignmentColorVariant}
                            size="small"
                            sx={{ fontWeight: 600, minWidth: 40 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            assignment.status === "completed"
                              ? "Completed"
                              : "Missing"
                          }
                          color={
                            assignment.status === "completed"
                              ? "success"
                              : "error"
                          }
                          size="small"
                          sx={{ minWidth: 80 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}
