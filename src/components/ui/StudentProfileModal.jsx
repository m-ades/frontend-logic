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
import { MetricCard } from "./MetricCard";

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
}) {
  const { courses, activeCourseId } = useCoursesState();
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();

  if (!student) return null;

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
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
            >
              <User size={16} color="#64748b" />
              <Typography variant="body2" color="text.secondary">
                {student.username}
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
              "#3b82f6",
              0.1
            )} 0%, ${alpha("#8b5cf6", 0.1)} 100%)`,
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
            gradient={["#3b82f6", "#2563eb"]}
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
                          {new Date(assignment.dueDate).toLocaleDateString()}
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
