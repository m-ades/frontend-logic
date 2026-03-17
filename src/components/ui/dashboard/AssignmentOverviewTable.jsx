import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  alpha,
  Tooltip as MuiTooltip,
} from "@mui/material";
import { CheckCircle } from "lucide-react";
import AssignmentDetailModal from "./AssignmentDetailModal";
import { useCoursesState } from "../../../context/CoursesContext";
import {
  getLetterGrade,
  getGradeColorVariant,
  getDefaultGradingScale,
} from "../../../utils/gradingUtils";
import { formatEasternDateTime } from "../../../utils/easternTime.js";

export const AssignmentOverviewTable = ({
  assignments: assignmentsProp,
  totalAverage: totalAverageProp,
  totalSubmissions: totalSubmissionsProp,
  totalPossible: totalPossibleProp,
  completionRate: completionRateProp,
} = {}) => {
  const { courses, activeCourseId, assignmentsByCourse, gradebookByCourse } =
    useCoursesState();
  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const assignments = assignmentsProp ?? (assignmentsByCourse[activeCourseId] || []);
  const gradebook = gradebookByCourse[activeCourseId] || [];
  const gradebookStudentsOnly = gradebook.filter((s) => s.role !== "ta");
  const totalStudents = activeCourse?.studentCount ?? gradebookStudentsOnly.length;

  // Use course's grading scale or default
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Metrics use students only
  const assignmentsWithMetrics = assignments.map((assignment) => {
    const assignmentId = assignment?.id;
    const submissions =
      assignment.submissions ??
      gradebookStudentsOnly.filter((student) => Boolean(student.submittedAssignments?.[assignmentId]))
        .length;

    const grades = gradebookStudentsOnly
      .map((student) => student.grades[assignmentId])
      .filter((grade) => grade !== undefined && grade !== null);

    const average =
      assignment.average ??
      (grades.length > 0
        ? Math.round(
            grades.reduce((sum, grade) => sum + grade, 0) / grades.length
          )
        : 0);

    const lateSubmissions =
      assignment.lateSubmissions ??
      gradebookStudentsOnly.filter(
        (student) =>
          Boolean(student.submittedAssignments?.[assignmentId]) &&
          student.lateSubmissions?.[assignmentId]
      ).length;

    const avgAttempts = assignment.avgAttempts ?? null;
    const medianMinutesPerQuestion =
      typeof assignment.medianMinutesPerQuestion === "number"
        ? assignment.medianMinutesPerQuestion
        : typeof assignment.avgMinutesPerQuestion === "number"
        ? assignment.avgMinutesPerQuestion
        : null;

    const difficultyLabel = assignment.difficultyLabel || assignment.difficulty_label || null;

    return {
      ...assignment,
      name: assignment.name || assignment.title || "Assignment",
      dueDate: assignment.dueDate || assignment.dueAt || assignment.due_at || assignment.due_date,
      dueTime: assignment.dueTime || assignment.due_time,
      submissions,
      average,
      lateSubmissions,
      avgAttempts,
      totalStudents,
      medianMinutesPerQuestion,
      difficultyLabel,
    };
  });

  // Calculate totals
  const totalSubmissions =
    totalSubmissionsProp ??
    assignmentsWithMetrics.reduce((sum, a) => sum + a.submissions, 0);
  const totalPossible =
    totalPossibleProp ?? assignments.length * totalStudents;
  const totalAverage =
    totalAverageProp ??
    (assignmentsWithMetrics.length > 0
      ? Math.round(
          assignmentsWithMetrics.reduce((sum, a) => sum + a.average, 0) /
            assignmentsWithMetrics.length
        )
      : 0);
  const completionRate =
    completionRateProp ??
    (totalPossible > 0
      ? Math.round((totalSubmissions / totalPossible) * 100)
      : 0);

  const handleAssignmentClick = (assignment) => {
    setSelectedAssignmentId(assignment.id);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedAssignmentId(null);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={0.5}>
            Assignment Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Click any assignment to view detailed analytics
          </Typography>

          {/* Summary Metrics */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            sx={{
              p: 2,
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                fontWeight={500}
              >
                Overall Average
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {totalAverage}%
              </Typography>
              <Chip
                label={getLetterGrade(totalAverage, gradingScale)}
                color={getGradeColorVariant(totalAverage, gradingScale)}
                size="small"
                sx={{ mt: 0.5, fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                fontWeight={500}
              >
                Total Submissions
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {totalSubmissions}/{totalPossible}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                fontWeight={500}
              >
                Avg Completion Rate
              </Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">
                {completionRate}%
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                  Assignment
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, fontSize: 13, minWidth: 160 }}
                >
                  Due Date & Time
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Average
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Grade
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Submissions
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Completion
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Avg Attempts
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Late
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Median Time
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 600, fontSize: 13 }}
                >
                  Difficulty
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignmentsWithMetrics.map((assignment) => {
                const letterGrade = getLetterGrade(
                  assignment.average,
                  gradingScale
                );
                const gradeColor = getGradeColorVariant(
                  assignment.average,
                  gradingScale
                );
                const assignmentCompletionRate =
                  totalStudents > 0
                    ? Math.round((assignment.submissions / totalStudents) * 100)
                    : 0;

                return (
                  <TableRow
                    key={assignment.id}
                    hover
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                        transform: "scale(1.001)",
                      },
                    }}
                    onClick={() => handleAssignmentClick(assignment)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {assignment.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatEasternDateTime(
                          assignment.dueDate,
                          assignment.dueTime
                        ) ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {assignment.average}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={letterGrade}
                        color={gradeColor}
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 40 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {assignment.submissions}/{totalStudents}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          {assignmentCompletionRate}%
                        </Typography>
                        {assignmentCompletionRate === 100 && (
                          <CheckCircle size={16} color="#10b981" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <MuiTooltip title="Average attempts per student">
                        <Typography variant="body2" color="text.secondary">
                          {assignment.avgAttempts !== null && assignment.avgAttempts !== undefined
                            ? Number(assignment.avgAttempts).toFixed(1)
                            : "—"}
                        </Typography>
                      </MuiTooltip>
                    </TableCell>
                    <TableCell align="center">
                      {assignment.lateSubmissions > 0 ? (
                        <Chip
                          label={assignment.lateSubmissions}
                          size="small"
                          color="warning"
                          sx={{ minWidth: 32 }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <MuiTooltip title="Median minutes per question for this assignment">
                        <Typography variant="body2" color="text.secondary">
                          {assignment.medianMinutesPerQuestion != null
                            ? `${Math.round(assignment.medianMinutesPerQuestion)} min${
                                Math.round(assignment.medianMinutesPerQuestion) === 1 ? "" : "s"
                              }`
                            : "—"}
                        </Typography>
                      </MuiTooltip>
                    </TableCell>
                    <TableCell align="center">
                      {assignment.difficultyLabel ? (
                        <MuiTooltip
                          title={
                            assignment.difficultyLabel === "too_easy"
                              ? "Students finish quickly with high correctness; good as a warm-up."
                              : assignment.difficultyLabel === "balanced"
                              ? "Time and correctness are in a healthy range for practice."
                              : assignment.difficultyLabel === "too_hard"
                              ? "Students spend a long time with low correctness; consider revising or scaffolding."
                              : assignment.difficultyLabel === "confusing"
                              ? "Short time but low correctness; wording or concepts may be unclear."
                              : ""
                          }
                        >
                          <Chip
                            label={
                              assignment.difficultyLabel === "too_easy"
                                ? "Quick & Easy"
                                : assignment.difficultyLabel === "balanced"
                                ? "Balanced"
                                : assignment.difficultyLabel === "too_hard"
                                ? "High Struggle"
                                : assignment.difficultyLabel === "confusing"
                                ? "Confusing"
                                : assignment.difficultyLabel
                            }
                            size="small"
                            color={
                              assignment.difficultyLabel === "too_easy"
                                ? "success"
                                : assignment.difficultyLabel === "balanced"
                                ? "primary"
                                : assignment.difficultyLabel === "too_hard"
                                ? "error"
                                : "warning"
                            }
                            sx={{ minWidth: 80 }}
                          />
                        </MuiTooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {assignmentsWithMetrics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No assignments yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Assignment Detail Modal */}
      <AssignmentDetailModal
        open={modalOpen}
        onClose={handleModalClose}
        assignmentId={selectedAssignmentId}
      />
    </>
  );
};
