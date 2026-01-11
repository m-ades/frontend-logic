import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  Paper,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  alpha,
} from "@mui/material";
import {
  X,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  FileEdit,
  Lock,
  Download,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import {
  useCoursesState,
  useCoursesDispatch,
  calculateAssignmentAverage,
  generateAvgTime,
} from "../../../context/CoursesContext";
import { MetricCard } from "../MetricCard";
import { GradeDistributionChart } from "./GradeDistributionChart";
import StudentSubmissionsTable from "./StudentSubmissionsTable";
import GradeBreakdown from "./GradeBreakdown";

// Helper to format date and time
function formatDateTime(dateString, timeString) {
  if (!dateString) return "—";

  const date = new Date(dateString);
  const dateFormatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!timeString) return dateFormatted;

  const [hours, minutes] = timeString.split(":");
  const timeFormatted = new Date(
    2000,
    0,
    1,
    parseInt(hours),
    parseInt(minutes)
  ).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateFormatted} at ${timeFormatted}`;
}

// Helper functions
function getLetterGrade(grade) {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}

function getGradeColor(grade) {
  if (grade >= 90) return "success";
  if (grade >= 80) return "info";
  if (grade >= 70) return "warning";
  if (grade >= 60) return "default";
  return "error";
}

export default function AssignmentDetailModal({ open, onClose, assignmentId }) {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const dispatch = useCoursesDispatch();

  // Pull data from context
  const { activeCourseId, assignmentsByCourse, gradebookByCourse, courses } =
    useCoursesState();

  // Get current course and assignment data
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const assignments = assignmentsByCourse[activeCourseId] || [];
  const gradebook = gradebookByCourse[activeCourseId] || [];
  const assignment = assignments.find((a) => a.id === assignmentId);

  if (!assignment) return null;

  // Calculate metrics from context data
  const totalStudents = activeCourse?.studentCount || gradebook.length || 0;
  const submissions = gradebook.filter(
    (student) => student.grades[assignment.id] !== undefined
  ).length;

  const completionRate =
    totalStudents > 0 ? Math.round((submissions / totalStudents) * 100) : 0;

  const averageGrade = calculateAssignmentAverage(assignment.id, gradebook);

  // Count late submissions from gradebook
  const lateSubmissions = gradebook.filter(
    (student) => student.lateSubmissions?.[assignment.id]
  ).length;

  // Get average time from context utility
  const avgTime = generateAvgTime(assignment.id);

  // Calculate grade distribution
  const gradeDistribution = [
    { grade: "A", range: "90-100", count: 0, color: "#10b981" },
    { grade: "B", range: "80-89", count: 0, color: "#3b82f6" },
    { grade: "C", range: "70-79", count: 0, color: "#f59e0b" },
    { grade: "D", range: "60-69", count: 0, color: "#f97316" },
    { grade: "F", range: "0-59", count: 0, color: "#ef4444" },
  ];

  gradebook.forEach((student) => {
    const grade = student.grades[assignment.id];
    if (grade !== undefined && grade !== null) {
      if (grade >= 90) gradeDistribution[0].count++;
      else if (grade >= 80) gradeDistribution[1].count++;
      else if (grade >= 70) gradeDistribution[2].count++;
      else if (grade >= 60) gradeDistribution[3].count++;
      else gradeDistribution[4].count++;
    }
  });

  // Student submissions with grades
  const studentSubmissions = gradebook
    .map((student) => {
      const grade = student.grades[assignment.id];
      const isLate = student.lateSubmissions?.[assignment.id] || false;

      return {
        ...student,
        grade,
        isLate,
        submitted: grade !== undefined && grade !== null,
        letterGrade: grade !== undefined ? getLetterGrade(grade) : "—",
      };
    })
    .sort((a, b) => {
      // Sort: submitted first, then by grade descending
      if (a.submitted && !b.submitted) return -1;
      if (!a.submitted && b.submitted) return 1;
      if (a.grade !== undefined && b.grade !== undefined)
        return b.grade - a.grade;
      return 0;
    });

  const studentsAtRisk = studentSubmissions.filter(
    (s) => s.submitted && s.grade < 70
  ).length;

  // Action handlers using context dispatch
  const handleToggleLock = () => {
    const updatedAssignments = assignments.map((a) =>
      a.id === assignment.id ? { ...a, isLocked: !a.isLocked } : a
    );
    dispatch({
      type: "SET_ASSIGNMENTS",
      courseId: activeCourseId,
      payload: updatedAssignments,
    });
  };

  const handleTogglePublish = () => {
    const updatedAssignments = assignments.map((a) =>
      a.id === assignment.id ? { ...a, isPublished: !a.isPublished } : a
    );
    dispatch({
      type: "SET_ASSIGNMENTS",
      courseId: activeCourseId,
      payload: updatedAssignments,
    });
  };

  const handleOpenBuilder = () => {
    navigate("/instructor/assignment-builder", {
      state: { assignmentId: assignment.id },
    });
    onClose();
  };

  const handleExportGrades = () => {
    // Export grades as CSV
    const csv = [
      ["Student", "Email", "Grade", "Letter Grade", "Status", "Late"].join(","),
      ...studentSubmissions.map((s) =>
        [
          s.name,
          s.email,
          s.grade ?? "",
          s.letterGrade,
          s.submitted ? "Submitted" : "Missing",
          s.isLate ? "Yes" : "No",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assignment.name.replace(/\s+/g, "_")}_grades.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            maxHeight: "90vh",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                {assignment.name}
              </Typography>
              {assignment.isLocked && (
                <Chip
                  icon={<Lock size={14} />}
                  label="Locked"
                  size="small"
                  color="warning"
                />
              )}
              {!assignment.isPublished && (
                <Chip label="Draft" size="small" color="default" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Due: {formatDateTime(assignment.dueDate, assignment.dueTime)} •{" "}
              {assignment.totalPoints || 100} points • Avg time: {avgTime}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {/* Quick Controls */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: alpha("#3b82f6", 0.05),
            border: "1px solid",
            borderColor: alpha("#3b82f6", 0.1),
            borderRadius: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={assignment.isPublished ?? true}
                  onChange={handleTogglePublish}
                  size="small"
                  disabled={assignment.isLocked}
                />
              }
              label={<Typography variant="body2">Published</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={assignment.isLocked ?? false}
                  onChange={handleToggleLock}
                  size="small"
                />
              }
              label={<Typography variant="body2">Locked</Typography>}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              startIcon={<FileEdit size={16} />}
              onClick={handleOpenBuilder}
            >
              Open Builder
            </Button>
            <Button
              size="small"
              startIcon={<Download size={16} />}
              variant="outlined"
              onClick={handleExportGrades}
            >
              Export Grades
            </Button>
          </Stack>
        </Paper>

        {/* Key Metrics */}
        <Grid
          container
          spacing={2}
          sx={{
            mb: 3,
            display: "flex",
          }}
        >
          {[
            {
              title: "Average Grade",
              value: `${averageGrade}%`,
              subtitle: getLetterGrade(averageGrade),
              icon: Award,
              gradient: ["#3b82f6", "#1d4ed8"],
            },
            {
              title: "Completion Rate",
              value: `${completionRate}%`,
              subtitle: `${submissions}/${totalStudents} submitted`,
              icon: CheckCircle,
              gradient: ["#10b981", "#059669"],
            },
            {
              title: "Late Submissions",
              value: lateSubmissions,
              subtitle: lateSubmissions > 0 ? "Need review" : "All on time",
              icon: Clock,
              gradient: ["#f59e0b", "#d97706"],
            },
            {
              title: "Students at Risk",
              value: studentsAtRisk,
              subtitle: studentsAtRisk > 0 ? "Below 70%" : "All passing",
              icon: AlertTriangle,
              gradient: ["#ef4444", "#dc2626"],
            },
          ].map((metric) => (
            <Grid
              key={metric.title}
              item
              sx={{
                flex: 1,
                minWidth: 220,
                display: "flex",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <MetricCard {...metric} />
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Analytics" />
            <Tab label="Student Submissions" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Box sx={{ gap: 4, display: "flex", flexDirection: "column" }}>
            {/* Grade Distribution Chart */}
            <GradeDistributionChart
              data={gradeDistribution}
              total={submissions}
            />

            {/* Distribution Details */}
            <GradeBreakdown data={gradeDistribution} total={submissions} />
          </Box>
        )}

        {activeTab === 1 && (
          <StudentSubmissionsTable
            students={studentSubmissions}
            onView={(student) => {
              console.log("View submission:", student);
              // TODO: Implement view submission functionality
            }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<FileEdit size={16} />}
          onClick={handleOpenBuilder}
        >
          Edit in Builder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
