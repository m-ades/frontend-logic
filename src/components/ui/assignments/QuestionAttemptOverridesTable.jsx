import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export default function QuestionAttemptOverridesTable({
  rows = [],
  baseAttemptLimit = 3,
  loading = false,
}) {
  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading overrides…
      </Typography>
    );
  }

  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No per-student extra attempts for this question yet.
      </Typography>
    );
  }

  const baseLimit = Number.isFinite(Number(baseAttemptLimit)) ? Number(baseAttemptLimit) : 3;

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell align="right">Extra attempts</TableCell>
            <TableCell align="right">Effective limit</TableCell>
            <TableCell>Reason</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const extra = Number(row.extra_attempts ?? row.extraAttempts ?? 0);
            const username = row.User?.username ?? row.username ?? `User ${row.user_id}`;
            return (
              <TableRow key={row.id ?? `${row.user_id}-${extra}`}>
                <TableCell>{username}</TableCell>
                <TableCell align="right">{extra}</TableCell>
                <TableCell align="right">{Math.max(1, baseLimit + extra)}</TableCell>
                <TableCell>{row.reason || "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
