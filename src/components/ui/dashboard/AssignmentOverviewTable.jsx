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

export const AssignmentOverviewTable = ({
  assignments,
  totalAverage,
  totalSubmissions,
  totalPossible,
  completionRate,
  onAssignmentClick,
}) => (
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
        Detailed performance metrics
      </Typography>

      {/* Summary Metrics */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={3}
        sx={{
          p: 2,
          backgroundColor: alpha("#3b82f6", 0.05),
          borderRadius: 2,
          border: "1px solid",
          borderColor: alpha("#3b82f6", 0.1),
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
            <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
              Due Date
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
              Average
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
              Grade
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
              Submissions
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
              Completion
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
              Avg Time
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
              Late
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assignments.map((assignment) => {
            const letterGrade = getLetterGrade(assignment.average);
            const gradeColor = getGradeColor(assignment.average);
            const assignmentCompletionRate = Math.round(
              (assignment.submissions / assignment.totalStudents) * 100
            );

            return (
              <TableRow
                key={assignment.id}
                hover
                sx={{
                  cursor: "pointer",
                  "&:hover": { backgroundColor: alpha("#3b82f6", 0.04) },
                }}
                onClick={() => onAssignmentClick(assignment)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {assignment.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {assignment.dueDate}
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
                    {assignment.submissions}/{assignment.totalStudents}
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
                  <MuiTooltip title="Average time students spent">
                    <Typography variant="body2" color="text.secondary">
                      {assignment.avgTime}
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  </Paper>
);
