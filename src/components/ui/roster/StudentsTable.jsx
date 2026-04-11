import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import { Plus, MoreVertical } from "lucide-react";

export default function StudentsTable({
  students,
  onStudentClick,
  onMenuClick,
  onAddStudent,
  getStudentStats,
  searchQuery,
}) {
  if (students.length === 0) {
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
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? "No students found" : "No students enrolled yet"}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {searchQuery
              ? "Try a different search query"
              : "Add students to get started"}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={onAddStudent}
            >
              Add Student
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

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
      <Box sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
              <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Average
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Grade
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Completed
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Late
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => {
              const stats = getStudentStats(student);
              const hasPastDueBasis = (stats.pastDueCount ?? 0) > 0;
              const letterGrade =
                stats.average >= 90
                  ? "A"
                  : stats.average >= 80
                  ? "B"
                  : stats.average >= 70
                  ? "C"
                  : stats.average >= 60
                  ? "D"
                  : "F";
              const gradeColor =
                stats.average >= 90
                  ? "success"
                  : stats.average >= 80
                  ? "info"
                  : stats.average >= 70
                  ? "warning"
                  : stats.average >= 60
                  ? "default"
                  : "error";

              return (
                <TableRow
                  key={student.id}
                  hover
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  <TableCell onClick={() => onStudentClick(student)}>
                    <Typography variant="body2" fontWeight={500}>
                      {student.username}
                    </Typography>
                  </TableCell>

                  <TableCell
                    align="center"
                    onClick={() => onStudentClick(student)}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={
                        hasPastDueBasis && stats.average < 70
                          ? "error.main"
                          : "text.primary"
                      }
                    >
                      {hasPastDueBasis ? `${stats.average}%` : "—"}
                    </Typography>
                  </TableCell>

                  <TableCell
                    align="center"
                    onClick={() => onStudentClick(student)}
                  >
                    {hasPastDueBasis ? (
                      <Chip
                        label={letterGrade}
                        color={gradeColor}
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 40 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell
                    align="center"
                    onClick={() => onStudentClick(student)}
                  >
                    <Typography variant="body2">{stats.completed}</Typography>
                  </TableCell>

                  <TableCell
                    align="center"
                    onClick={() => onStudentClick(student)}
                  >
                    {stats.lateCount > 0 ? (
                      <Chip
                        label={stats.lateCount}
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
                    <Tooltip title="More Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => onMenuClick(e, student)}
                      >
                        <MoreVertical size={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
