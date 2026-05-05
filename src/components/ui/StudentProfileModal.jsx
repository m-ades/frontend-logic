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
  Popover,
  alpha,
  useTheme,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  X,
  User,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  getLetterGrade,
  getGradeColor,
  getDefaultGradingScale,
} from "../../utils/gradingUtils";
import { formatDate } from "../../utils/formatting.js";
import {
  formatEasternFromIso,
  formatEasternDateTime,
  parseDueDateAsEastern,
} from "../../utils/easternTime.js";
import { MetricCard } from "./MetricCard";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";
import { getStudentAverage } from "../../utils/GradebookUtils.js";

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

const statusColors = {
  completed: "#10b981",
  inProgress: "#6366f1",
  notStarted: "#64748b",
  incomplete: "#f97316",
  missing: "#ef4444",
  notReleased: "#94a3b8",
  lateMarker: "#f59e0b",
};

const filledStatusChip = (color) => ({
  bgcolor: color,
  color: "common.white",
});

const statusChip = {
  completed: {
    label: "Completed",
    title: "All questions submitted",
    sx: filledStatusChip(statusColors.completed),
  },
  inProgress: {
    label: "In Progress",
    sx: filledStatusChip(statusColors.inProgress),
  },
  notStarted: {
    label: "Not started",
    sx: filledStatusChip(statusColors.notStarted),
  },
  incomplete: {
    label: "Incomplete",
    variant: "outlined",
    sx: { borderColor: statusColors.incomplete, color: statusColors.incomplete },
  },
  missing: {
    label: "Missing",
    sx: filledStatusChip(statusColors.missing),
  },
  notReleased: {
    label: "Not released",
    sx: filledStatusChip(statusColors.notReleased),
  },
};

const statusByState = {
  before: {
    complete: "completed",
    partial: "inProgress",
    none: "notStarted",
  },
  grace: {
    complete: "completed",
    partial: "incomplete",
    none: "missing",
  },
  after: {
    complete: "completed",
    partial: "incomplete",
    none: "missing",
  },
};

const headerCellSx = {
  fontWeight: 600,
  backgroundColor: "background.paper",
};

const lateIconSx = {
  position: "absolute",
  left: "calc(100% + 4px)",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 16,
  color: statusColors.lateMarker,
};

const lateIconStatuses = new Set(["completed", "incomplete"]);

const exactChipColor = (color) =>
  color && color !== "default"
    ? { bgcolor: color, color: "common.white" }
    : {};

const makeDeadlineMap = (rows = []) =>
  rows.reduce((map, row) => {
    if (row?.assignment_id) map[row.assignment_id] = row;
    return map;
  }, {});

const fetchDeadlineMap = async (courseActions, activeCourseId, studentId) =>
  makeDeadlineMap(
    await courseActions.getDeadlines?.(activeCourseId, studentId)
  );

const getGradeMeta = (grade, gradingScale) => {
  const color = getGradeColor(grade, gradingScale);
  return {
    letter: getLetterGrade(grade, gradingScale),
    chipColor: color === "default" ? "default" : undefined,
    chipSx: exactChipColor(color),
    textColor: color === "default" ? "text.primary" : color,
  };
};

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
  const { courseState, courseActions } = useAppRuntime();
  const { courses, activeCourseId } = courseState;
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();

  // pull any existing accommodations for this student
  const [accommodationLoading, setAccommodationLoading] = useState(false);
  const [accommodationError, setAccommodationError] = useState("");
  const [accommodationSaved, setAccommodationSaved] = useState(false);
  const [extraLateDays, setExtraLateDays] = useState("0");
  const [latePenaltyWaived, setLatePenaltyWaived] = useState(false);
  const [accommodationAnchorEl, setAccommodationAnchorEl] = useState(null);

  // per assignment override for just this student
  const [extensionAssignmentId, setExtensionAssignmentId] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionTime, setExtensionTime] = useState("23:59");
  const [extensionSaving, setExtensionSaving] = useState(false);
  const [extensionError, setExtensionError] = useState("");
  const [deadlineMap, setDeadlineMap] = useState({});
  const [extensionAnchorEl, setExtensionAnchorEl] = useState(null);
  const [extensionPopoverAssignmentId, setExtensionPopoverAssignmentId] =
    useState(null);

  const extensionPopoverAssignment = useMemo(() => {
    if (!extensionPopoverAssignmentId) return null;
    return assignments.find(
      (a) => String(a.id) === String(extensionPopoverAssignmentId)
    );
  }, [assignments, extensionPopoverAssignmentId]);

  // hydrate accommodations when the modal opens
  useEffect(() => {
    if (!open || !student || !canEditAccommodations) return;
    let isMounted = true;
    const load = async () => {
      setAccommodationLoading(true);
      setAccommodationError("");
      try {
        const rows = await courseActions.getAccommodations?.(activeCourseId, student.id);
        if (!isMounted) return;
        const record = (rows || []).find((r) => r.user_id === student.id);
        const lateDaysValue = Number.isFinite(Number(record?.extra_late_days))
          ? String(record.extra_late_days)
          : "0";
        setExtraLateDays(lateDaysValue);
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
  }, [open, student, activeCourseId, canEditAccommodations, courseActions]);

  useEffect(() => {
    if (!open || !student || !canEditAccommodations) return;
    let isMounted = true;
    const load = async () => {
      try {
        const map = await fetchDeadlineMap(courseActions, activeCourseId, student.id);
        if (!isMounted) return;
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
  }, [open, student, activeCourseId, canEditAccommodations, courseActions]);

  // compose a single timestamp for the api
  const buildIsoDateTime = (date, time) => {
    if (!date) return null;
    const safeTime = time || "00:00";
    return new Date(`${date}T${safeTime}:00`).toISOString();
  };

  // store course level accommodations for this student
  const handleSaveAccommodation = async () => {
    if (!student) return;
    setAccommodationSaved(false);
    setAccommodationError("");
    setAccommodationLoading(true);
    try {
      const payload = {
        user_id: student.id,
        extra_late_days: Math.max(0, parseInt(extraLateDays || "0", 10) || 0),
        late_penalty_waived: Boolean(latePenaltyWaived),
      };
      await courseActions.saveAccommodations?.(activeCourseId, student.id, payload);
      try {
        const map = await fetchDeadlineMap(courseActions, activeCourseId, student.id);
        setDeadlineMap(map);
      } catch (err) {
        // keep existing deadlines
      }
      setAccommodationSaved(true);
      setAccommodationAnchorEl(null);
      setTimeout(() => setAccommodationSaved(false), 1500);
    } catch (err) {
      setAccommodationError("Failed to save accommodations.");
    } finally {
      setAccommodationLoading(false);
    }
  };

  const handleOpenAccommodationPopover = (event) => {
    if (!canEditAccommodations) return;
    setAccommodationAnchorEl(event.currentTarget);
  };

  const handleCloseAccommodationPopover = () => {
    setAccommodationAnchorEl(null);
  };

  // store a per assignment due date override
  const handleSaveExtension = async () => {
    setExtensionError("");
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
      await courseActions.saveDeadline?.(activeCourseId, assignmentId, student.id, iso);
      try {
        const map = await fetchDeadlineMap(courseActions, activeCourseId, student.id);
        setDeadlineMap(map);
      } catch (err) {
        setDeadlineMap((prev) => ({
          ...prev,
          [assignmentId]: {
            ...(prev?.[assignmentId] ?? {}),
            due_at: iso,
          },
        }));
      }
      setExtensionAnchorEl(null);
      setExtensionPopoverAssignmentId(null);
    } catch (err) {
      setExtensionError("Failed to save extension.");
    } finally {
      setExtensionSaving(false);
    }
  };

  const handleSelectExtensionAssignment = (event, assignment) => {
    if (!canEditAccommodations) return;
    setExtensionError("");
    setExtensionAssignmentId(String(assignment.id));
    setExtensionDate(assignment.dueDate || "");
    setExtensionTime(assignment.dueTime || "23:59");
    setExtensionPopoverAssignmentId(assignment.id);
    setExtensionAnchorEl(event.currentTarget);
  };

  const handleCloseExtensionPopover = () => {
    setExtensionAnchorEl(null);
    setExtensionPopoverAssignmentId(null);
  };

  if (!student) return null;

  const normalizedRole =
    String(student.role || "student").toLowerCase() === "ta" ? "ta" : "student";
  const roleLabel = normalizedRole === "ta" ? "TA" : "Student";
  const handleRoleClick = () => {
    if (!canToggleRole || !onToggleRole) return;
    const newRole = normalizedRole === "ta" ? "student" : "ta";
    const newRoleLabel = newRole === "ta" ? "TA" : "Student";
    const message = `Change ${student.username}'s role to ${newRoleLabel}?`;
    if (window.confirm(message)) {
      onToggleRole(student, newRole);
    }
  };

  const average = getStudentAverage(student);
  const averageGrade = getGradeMeta(average, gradingScale);

  const isAssignmentLocked = (assignment) =>
    assignment.is_locked === true || assignment.isLocked === true;
  const getAssignmentStatus = (assignment) => {
    if (isAssignmentLocked(assignment)) return "notReleased";

    const submitted = Number(student.submittedQuestionCounts?.[assignment.id] || 0);
    const total = Number(assignment.questionCount || assignment.question_count || 0);
    const submission =
      total > 0 && submitted >= total
        ? "complete"
        : submitted > 0
        ? "partial"
        : "none";
    const dueAt = deadlineMap?.[assignment.id]?.due_at
      ? new Date(deadlineMap[assignment.id].due_at)
      : assignment.dueAt
      ? new Date(assignment.dueAt)
      : parseDueDateAsEastern(assignment.dueDate, assignment.dueTime || "23:59");
    const lateDays = Number(assignment.lateWindowDays || assignment.late_window_days || 0);
    const cutoffAt = deadlineMap?.[assignment.id]?.cutoff_at
      ? new Date(deadlineMap[assignment.id].cutoff_at)
      : dueAt && lateDays > 0
      ? new Date(dueAt.getTime() + lateDays * 24 * 60 * 60 * 1000)
      : dueAt;
    const now = new Date();
    const time =
      !dueAt || now <= dueAt ? "before" : !cutoffAt || now <= cutoffAt ? "grace" : "after";

    return statusByState[time][submission];
  };

  const assignmentDetails = assignments.map((assignment) => ({
    ...assignment,
    studentGrade: student.grades[assignment.id],
    status: getAssignmentStatus(assignment),
    submittedLate: Boolean(student.lateSubmissions?.[assignment.id]),
  }));
  const unlockedAssignmentDetails = assignmentDetails.filter(
    (assignment) => assignment.status !== "notReleased"
  );
  const totalAssignments = unlockedAssignmentDetails.length;
  const completedAssignments = unlockedAssignmentDetails.filter(
    (assignment) => assignment.status === "completed"
  ).length;
  const missingAssignments = unlockedAssignmentDetails.filter(
    (assignment) => assignment.status === "missing"
  ).length;
  const completionRate = totalAssignments
    ? Math.round((completedAssignments / totalAssignments) * 100)
    : 0;

  // Grade distribution
  const gradeValues = Object.values(student.grades).filter(Number.isFinite);
  const highestGrade = gradeValues.length > 0 ? Math.max(...gradeValues) : 0;
  const lowestGrade = gradeValues.length > 0 ? Math.min(...gradeValues) : 0;

  // Performance trend
  const trend = calculateTrend(student.grades, assignments);

  const getBaseDueLabel = (assignment) => {
    if (assignment.dueAt) {
      return formatEasternFromIso(assignment.dueAt, { includeTime: true }) ?? "—";
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

  const getExtensionInfo = (assignment) => {
    const policy = deadlineMap?.[assignment.id];
    if (!policy?.extension_due_at) return null;
    const originalSource = assignment?.dueAt
      ? assignment.dueAt
      : assignment?.dueDate
      ? `${assignment.dueDate}T${assignment.dueTime || "23:59"}:00`
      : null;
    if (!originalSource) return null;
    const originalTs = Date.parse(originalSource);
    const extendedTs = Date.parse(policy.extension_due_at);
    if (!Number.isFinite(originalTs) || !Number.isFinite(extendedTs)) return null;
    if (Math.abs(extendedTs - originalTs) < 1000) return null;
    const extendedLabel =
      formatEasternFromIso(policy.extension_due_at, { includeTime: true }) ?? null;
    if (!extendedLabel) return null;
    return { extendedLabel };
  };

  const getAccommodationInfo = (assignment) => {
    const policy = deadlineMap?.[assignment.id];
    if (!policy) return null;
    const extraLateDays = Number(policy.extra_late_days) || 0;
    const penaltyWaived = Boolean(policy.late_penalty_waived);
    if (extraLateDays <= 0 && !penaltyWaived) return null;
    const parts = [];
    if (extraLateDays > 0) {
      const accommodationLabel =
        formatEasternFromIso(policy.accommodation_due_at, { includeTime: true }) ?? null;
      parts.push(accommodationLabel ? accommodationLabel : `+${extraLateDays} days`);
    }
    if (penaltyWaived) {
      parts.push("Late penalty waived");
    }
    return { parts };
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
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
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
                    ? `Change role to ${normalizedRole === "ta" ? "Student" : "TA"}`
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
              {canEditAccommodations && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenAccommodationPopover}
                  disabled={accommodationLoading}
                >
                  Accommodations
                </Button>
              )}
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
            <Grid size={{ xs: 12, md: 6 }}>
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
                  label={averageGrade.letter}
                  color={averageGrade.chipColor}
                  sx={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    height: 32,
                    ...averageGrade.chipSx,
                  }}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
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
            subtitle={missingAssignments === 0 ? "All done" : "Assignments due"}
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
                  <TableCell sx={headerCellSx}>
                    Assignment
                  </TableCell>
                  <TableCell sx={headerCellSx}>
                    Due Date
                  </TableCell>
                  <TableCell align="center" sx={headerCellSx}>
                    Grade
                  </TableCell>
                  <TableCell align="center" sx={headerCellSx}>
                    Letter
                  </TableCell>
                  <TableCell align="center" sx={headerCellSx}>
                    Submission
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignmentDetails.map((assignment) => {
                  const extensionInfo = getExtensionInfo(assignment);
                  const accommodationInfo = getAccommodationInfo(assignment);
                  const status = statusChip[assignment.status] || statusChip.missing;
                  const showLateIcon =
                    assignment.submittedLate &&
                    lateIconStatuses.has(assignment.status);
                  const gradeMeta =
                    assignment.studentGrade !== undefined
                      ? getGradeMeta(assignment.studentGrade, gradingScale)
                      : null;
                  return (
                    <TableRow key={assignment.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            onClick={(event) =>
                              handleSelectExtensionAssignment(event, assignment)
                            }
                            sx={{
                              cursor: canEditAccommodations
                                ? "pointer"
                                : "default",
                              "&:hover": canEditAccommodations
                                ? { textDecoration: "underline" }
                                : undefined,
                            }}
                          >
                            {assignment.name}
                          </Typography>
                          {extensionInfo && (
                            <Typography variant="caption" color="text.secondary">
                              Extension: {extensionInfo.extendedLabel}
                            </Typography>
                          )}
                          {accommodationInfo &&
                            accommodationInfo.parts.map((part, index) => (
                              <Typography
                                key={`accommodation-${assignment.id}-${index}`}
                                variant="caption"
                                color="text.secondary"
                              >
                                Accommodation: {part}
                              </Typography>
                            ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {getBaseDueLabel(assignment)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {assignment.studentGrade !== undefined ? (
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={gradeMeta.textColor}
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
                            label={gradeMeta.letter}
                            color={gradeMeta.chipColor}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              minWidth: 40,
                              ...gradeMeta.chipSx,
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            position: "relative",
                            display: "inline-flex",
                            justifyContent: "center",
                          }}
                        >
                          <Chip
                            label={status.label}
                            variant={status.variant}
                            title={status.title}
                            size="small"
                            sx={{ minWidth: 96, ...status.sx }}
                          />
                          {showLateIcon && (
                            <AccessTimeIcon
                              titleAccess="submitted late"
                              sx={lateIconSx}
                            />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </DialogContent>
      <Popover
        open={Boolean(extensionAnchorEl)}
        anchorEl={extensionAnchorEl}
        onClose={handleCloseExtensionPopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { p: 2, width: 320 } }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              Extension
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {extensionPopoverAssignment?.name ?? "Assignment"}
            </Typography>
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={handleCloseExtensionPopover}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveExtension}
              disabled={extensionSaving}
            >
              Save Extension
            </Button>
          </Box>
        </Stack>
      </Popover>
      <Popover
        open={Boolean(accommodationAnchorEl)}
        anchorEl={accommodationAnchorEl}
        onClose={handleCloseAccommodationPopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { p: 2, width: 320 } }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              Accommodations
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {student?.username ?? "Student"}
            </Typography>
          </Box>
          {accommodationLoading && <LinearProgress />}
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
            onChange={(e) => {
              const next = e.target.value;
              if (next === "") {
                setExtraLateDays("");
                return;
              }
              const parsed = parseInt(next, 10);
              if (Number.isNaN(parsed)) return;
              setExtraLateDays(String(Math.max(0, parsed)));
            }}
            inputProps={{ min: 0, max: 365 }}
            size="small"
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={handleCloseAccommodationPopover}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveAccommodation}
              disabled={accommodationLoading}
            >
              Save
            </Button>
          </Box>
        </Stack>
      </Popover>
    </Dialog>
  );
}
