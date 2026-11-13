import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { formatNumber } from "../../../utils/numberUtils.js";
import { formatDate } from "../../../utils/formatting.js";
import { formatEasternDateTime, formatEasternFromIso } from "../../../utils/easternTime.js";
import { getExtensionDueLabel } from "../../../utils/assignmentStatus.js";
import { getGradeMeta } from "./studentProfileUtils.js";

const statusColors = {
  completed: "#10b981",
  inProgress: "#6366f1",
  notStarted: "#64748b",
  incomplete: "#f97316",
  missing: "#ef4444",
  notReleased: "#94a3b8",
  lateMarker: "#f59e0b",
};

const filledStatusChip = (color) => ({
  bgcolor: color,
  color: "common.white",
});

const statusChip = {
  completed: {
    label: "Completed",
    title: "All questions submitted",
    sx: filledStatusChip(statusColors.completed),
  },
  inProgress: {
    label: "In Progress",
    sx: filledStatusChip(statusColors.inProgress),
  },
  notStarted: {
    label: "Not started",
    sx: filledStatusChip(statusColors.notStarted),
  },
  incomplete: {
    label: "Incomplete",
    variant: "outlined",
    sx: { borderColor: statusColors.incomplete, color: statusColors.incomplete },
  },
  missing: {
    label: "Missing",
    sx: filledStatusChip(statusColors.missing),
  },
  notReleased: {
    label: "Not released",
    sx: filledStatusChip(statusColors.notReleased),
  },
};

const headerCellSx = {
  fontWeight: 600,
  backgroundColor: "background.paper",
};

const lateIconSx = {
  position: "absolute",
  left: "calc(100% + 4px)",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 16,
  color: statusColors.lateMarker,
};

const lateIconStatuses = new Set(["completed", "incomplete"]);

const getBaseDueLabel = (assignment) => {
  if (assignment.dueAt) {
    return formatEasternFromIso(assignment.dueAt, { includeTime: true }) ?? "—";
  }
  if (assignment.dueDate) {
    return (
      formatEasternDateTime(assignment.dueDate, assignment.dueTime) ??
      formatDate(assignment.dueDate) ??
      "—"
    );
  }
  return "—";
};

const getAccommodationParts = (policy) => {
  if (!policy) return [];
  const extraLateDays = Number(policy.extra_late_days) || 0;
  const parts = [];
  if (extraLateDays > 0) {
    const accommodationLabel =
      formatEasternFromIso(policy.accommodation_due_at, { includeTime: true }) ?? null;
    parts.push(accommodationLabel ? accommodationLabel : `+${extraLateDays} days`);
  }
  if (policy.late_penalty_waived) {
    parts.push("Late penalty waived");
  }
  return parts;
};

const emptyCell = (
  <Typography variant="body2" color="text.secondary">
    —
  </Typography>
);

export default function StudentAssignmentTable({
  assignmentDetails,
  canEditAccommodations,
  deadlineMap,
  gradingScale,
  onSelectAssignment,
}) {
  return (
    <>
      <Typography variant="h6" component="h3" fontWeight={600} mb={2}>
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
                <TableCell sx={headerCellSx}>Assignment</TableCell>
                <TableCell sx={headerCellSx}>Due Date</TableCell>
                <TableCell align="center" sx={headerCellSx}>Grade</TableCell>
                <TableCell align="center" sx={headerCellSx}>Letter</TableCell>
                <TableCell align="center" sx={headerCellSx}>Submission</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignmentDetails.map((assignment) => {
                const policy = deadlineMap?.[assignment.id];
                const extensionLabel = getExtensionDueLabel(assignment, policy?.extension_due_at);
                const accommodationParts = getAccommodationParts(policy);
                const status = statusChip[assignment.status] || statusChip.missing;
                const showLateIcon =
                  assignment.submittedLate &&
                  lateIconStatuses.has(assignment.status);
                const gradeMeta =
                  assignment.studentGrade !== undefined
                    ? getGradeMeta(assignment.studentGrade, gradingScale)
                    : null;
                return (
                  <TableRow key={assignment.id} hover>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          onClick={(event) => onSelectAssignment(event, assignment)}
                          sx={{
                            cursor: canEditAccommodations ? "pointer" : "default",
                            "&:hover": canEditAccommodations
                              ? { textDecoration: "underline" }
                              : undefined,
                          }}
                        >
                          {assignment.name}
                        </Typography>
                        {extensionLabel && (
                          <Typography variant="caption" color="text.secondary">
                            Extension: {extensionLabel}
                          </Typography>
                        )}
                        {accommodationParts.map((part, index) => (
                          <Typography
                            key={`accommodation-${assignment.id}-${index}`}
                            variant="caption"
                            color="text.secondary"
                          >
                            Accommodation: {part}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {getBaseDueLabel(assignment)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {gradeMeta ? (
                        <Typography variant="body2" fontWeight={600} color={gradeMeta.textColor}>
                          {formatNumber(assignment.studentGrade)}%
                        </Typography>
                      ) : emptyCell}
                    </TableCell>
                    <TableCell align="center">
                      {gradeMeta ? (
                        <Chip
                          label={gradeMeta.letter}
                          color={gradeMeta.chipColor}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            minWidth: 40,
                            ...gradeMeta.chipSx,
                          }}
                        />
                      ) : emptyCell}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          position: "relative",
                          display: "inline-flex",
                          justifyContent: "center",
                        }}
                      >
                        <Chip
                          label={status.label}
                          variant={status.variant}
                          title={status.title}
                          size="small"
                          sx={{ minWidth: 96, ...status.sx }}
                        />
                        {showLateIcon && (
                          <AccessTimeIcon titleAccess="submitted late" sx={lateIconSx} />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </>
  );
}
