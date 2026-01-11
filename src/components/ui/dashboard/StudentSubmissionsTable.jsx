import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import { Users, CheckCircle, Eye, Clock } from "lucide-react";

function getGradeColor(grade) {
  if (grade >= 90) return "success";
  if (grade >= 80) return "info";
  if (grade >= 70) return "warning";
  if (grade >= 60) return "default";
  return "error";
}

export default function StudentSubmissionsTable({ students, onView }) {
  if (!students || students.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          textAlign: "center",
          py: 6,
        }}
      >
        <Users size={48} style={{ opacity: 0.4, marginBottom: 16 }} />
        <Typography color="text.secondary">
          No student data available
        </Typography>
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
              <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Status
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Grade
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Letter
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
            {students.map((student) => (
              <TableRow
                key={student.id}
                hover
                sx={{ opacity: student.submitted ? 1 : 0.6 }}
              >
                <TableCell>
                  <Typography fontWeight={500}>{student.name}</Typography>
                </TableCell>

                <TableCell>
                  <Typography color="text.secondary">
                    {student.email}
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  <Chip
                    size="small"
                    label={student.submitted ? "Submitted" : "Missing"}
                    color={student.submitted ? "success" : "default"}
                    icon={student.submitted ? <CheckCircle size={14} /> : null}
                  />
                </TableCell>

                <TableCell align="center">
                  <Typography
                    fontWeight={600}
                    color={
                      student.submitted && student.grade < 70
                        ? "error.main"
                        : "text.primary"
                    }
                  >
                    {student.submitted ? `${student.grade}%` : "—"}
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  {student.submitted ? (
                    <Chip
                      size="small"
                      label={student.letterGrade}
                      color={getGradeColor(student.grade)}
                      sx={{ fontWeight: 600, minWidth: 40 }}
                    />
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell align="center">
                  {student.submitted ? (
                    student.isLate ? (
                      <Tooltip title="Submitted after deadline">
                        <Chip
                          size="small"
                          label="Late"
                          color="warning"
                          icon={<Clock size={14} />}
                          sx={{ fontWeight: 600 }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        On time
                      </Typography>
                    )
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell align="center">
                  <Tooltip title="View Submission">
                    <IconButton
                      size="small"
                      disabled={!student.submitted}
                      onClick={() => onView?.(student)}
                    >
                      <Eye size={16} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
