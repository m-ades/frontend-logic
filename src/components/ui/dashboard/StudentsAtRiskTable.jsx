import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  alpha,
} from "@mui/material";
import { useCoursesState, getStudentsAtRisk } from "../../../context/CoursesContext";
import {
  getLetterGrade,
  getGradeColorVariant,
  getDefaultGradingScale,
} from "../../../utils/gradingUtils";

export const StudentsAtRiskTable = ({ students, assignments }) => {
  const { courses, activeCourseId } = useCoursesState();
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();

  // Find the threshold for "at risk" - typically anything below a passing grade
  // We'll consider the second-lowest grade level as the threshold
  // (e.g., if scale is A/B/C/D/F, anything below D is at risk)
  const sortedScale = [...gradingScale].sort(
    (a, b) => a.minPercent - b.minPercent
  );
  const atRiskThreshold =
    sortedScale.length > 1
      ? sortedScale[1].minPercent // Second lowest grade (e.g., D = 60)
      : 70; // Default to 70 if only one grade level

  const atRiskStudents = getStudentsAtRisk(students, assignments, atRiskThreshold).map(
    (student) => ({
      ...student,
      letterGrade: getLetterGrade(student.avg, gradingScale),
    })
  );

  // Get the grade level name for the threshold for display
  const thresholdGrade = gradingScale.find(
    (g) => g.minPercent === atRiskThreshold
  );
  const thresholdLabel = thresholdGrade
    ? `Below ${thresholdGrade.letter} (${atRiskThreshold}%)`
    : `Below ${atRiskThreshold}%`;

  return (
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Typography variant="h6" fontWeight={600}>
            Students at Risk
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {thresholdLabel}
        </Typography>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                Student
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
                Average
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
                Grade
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
                Missing
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {atRiskStudents.map((student) => (
              <TableRow
                key={student.id}
                hover
                sx={{
                  cursor: "pointer",
                  "&:hover": { backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04) },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {student.username}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="error.main"
                  >
                    {student.avg}%
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={student.letterGrade}
                    size="small"
                    color={getGradeColorVariant(student.avg, gradingScale)}
                    sx={{ fontWeight: 600, minWidth: 40 }}
                  />
                </TableCell>
                <TableCell align="center">
                  {student.missing > 0 ? (
                    <Chip
                      label={student.missing}
                      size="small"
                      color="warning"
                      sx={{ minWidth: 32 }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      0
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {atRiskStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No students at risk 🎉
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};
