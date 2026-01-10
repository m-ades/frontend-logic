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
import { X, Mail, TrendingUp, TrendingDown, Award, Clock } from "lucide-react";
import {
  calculateAverage,
  getLetterGrade,
} from "../../../utils/gradebookUtils";

function getGradeColor(grade) {
  if (grade >= 90) return "success";
  if (grade >= 80) return "info";
  if (grade >= 70) return "warning";
  if (grade >= 60) return "default";
  return "error";
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
  if (!student) return null;

  const average = calculateAverage(student.grades);
  const letterGrade = getLetterGrade(average);
  const gradeColor = getGradeColor(average);

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
              {student.name}
            </Typography>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
            >
              <Mail size={16} color="#64748b" />
              <Typography variant="body2" color="text.secondary">
                {student.email}
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
                  color={gradeColor}
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

        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                textAlign: "center",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Award size={24} color="#3b82f6" style={{ marginBottom: 8 }} />
              <Typography variant="h6" fontWeight={700}>
                {completedAssignments}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                textAlign: "center",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Clock size={24} color="#ef4444" style={{ marginBottom: 8 }} />
              <Typography variant="h6" fontWeight={700} color="error.main">
                {missingAssignments}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Missing
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                height: "100%",
              }}
            >
              {trend === "improving" && (
                <>
                  <TrendingUp size={24} color="#10b981" />
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="success.main"
                    >
                      Improving
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recent trend
                    </Typography>
                  </Box>
                </>
              )}
              {trend === "declining" && (
                <>
                  <TrendingDown size={24} color="#ef4444" />
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="error.main"
                    >
                      Declining
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recent trend
                    </Typography>
                  </Box>
                </>
              )}
              {trend === "stable" && (
                <>
                  <Box
                    sx={{
                      width: 24,
                      height: 2,
                      backgroundColor: "#64748b",
                      borderRadius: 1,
                    }}
                  />
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="text.secondary"
                    >
                      Stable
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recent trend
                    </Typography>
                  </Box>
                </>
              )}
              {!trend && (
                <Typography variant="body2" color="text.secondary">
                  Not enough data
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

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
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignmentDetails.map((assignment) => (
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
                          color={
                            assignment.studentGrade >= 70
                              ? "success.main"
                              : "error.main"
                          }
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
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}
