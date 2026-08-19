import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  alpha,
} from "@mui/material";
import { CalendarClock } from "lucide-react";
import { formatEasternFromIso } from "../../../utils/easternTime.js";

function studentName(row) {
  return row.User?.username || row.user?.username || `User ${row.user_id}`;
}

function grantedByName(row) {
  return row.grantedBy?.username || row.granted_by_user?.username || "—";
}

export default function AssignmentExtensionsTable({ rows = [] }) {
  if (rows.length === 0) {
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
        <CalendarClock size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
        <Typography color="text.secondary">
          No extensions for this assignment yet
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
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
              <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Extended due</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Granted by</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Granted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id ?? `${row.assignment_id}-${row.user_id}`} hover>
                <TableCell>{studentName(row)}</TableCell>
                <TableCell>
                  {formatEasternFromIso(row.extended_due_date, { includeTime: true }) || "—"}
                </TableCell>
                <TableCell sx={{ maxWidth: 240, whiteSpace: "normal", wordBreak: "break-word" }}>
                  {row.reason?.trim() ? row.reason : "—"}
                </TableCell>
                <TableCell>{grantedByName(row)}</TableCell>
                <TableCell>
                  {formatEasternFromIso(row.created_at, { includeTime: true }) || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
