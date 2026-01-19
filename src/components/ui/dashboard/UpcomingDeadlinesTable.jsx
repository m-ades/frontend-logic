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
import { Clock } from "lucide-react";

export const UpcomingDeadlinesTable = ({ assignments, onAssignmentClick }) => {
  const upcomingAssignments = assignments
    .map((a) => {
      const dueDate = new Date(a.dueDate);
      const today = new Date();
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...a, daysLeft: diffDays };
    })
    .filter((a) => a.daysLeft >= 0 && a.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

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
          Upcoming Deadlines
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Due in next 7 days
        </Typography>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                Assignment
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
                Due Date
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: 13 }}>
                Days Left
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {upcomingAssignments.map((assignment) => (
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
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">
                    {assignment.dueDate}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={
                      assignment.daysLeft === 0
                        ? "Today"
                        : assignment.daysLeft === 1
                        ? "Tomorrow"
                        : `${assignment.daysLeft} days`
                    }
                    size="small"
                    color={
                      assignment.daysLeft <= 1
                        ? "error"
                        : assignment.daysLeft <= 3
                        ? "warning"
                        : "default"
                    }
                    sx={{ fontWeight: 600, minWidth: 70 }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {upcomingAssignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No upcoming deadlines
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
