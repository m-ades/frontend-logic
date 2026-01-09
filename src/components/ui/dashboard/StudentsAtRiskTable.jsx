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
import { AlertTriangle } from "lucide-react";

export const StudentsAtRiskTable = ({ students, assignments }) => {
  const atRiskStudents = students
    .map((student) => {
      const grades = Object.values(student.grades).filter(
        (g) => g !== undefined
      );
      const avg =
        grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
          : 0;
      const missing = assignments.length - grades.length;
      return { ...student, avg, missing };
    })
    .filter((s) => s.avg < 70 && s.avg > 0)
    .sort((a, b) => a.avg - b.avg);

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
        <Typography variant="h6" fontWeight={600} mb={0.5}>
          Students at Risk
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Below 70% average
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
                  "&:hover": { backgroundColor: alpha("#3b82f6", 0.04) },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {student.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${student.avg}%`}
                    size="small"
                    color="error"
                    sx={{ fontWeight: 600, minWidth: 50 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">
                    {student.missing}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {atRiskStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
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
