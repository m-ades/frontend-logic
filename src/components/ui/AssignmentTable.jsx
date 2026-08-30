import {
  Paper,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Button,
  Divider,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Edit as EditIcon, Psychology as PracticeIcon } from "@mui/icons-material";
import {
  Lock,
  Unlock,
  MoreVertical,
  FileEdit,
  CheckCircle,
  Plus,
} from "lucide-react";
import { formatEasternDateTime } from "../../utils/easternTime.js";

// Helper function to format date and time
export default function AssignmentTable({
  items,
  type = "assignment",
  onView,
  onToggleLock,
  onTogglePublish,
  onMenuOpen,
  onEditDueDate,
  onCreate,
  emptyMessage,
  getStatusColor,
  getStatusText,
}) {
  const isPractice = type === "practice";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dueDateLabel = (item) => (
    formatEasternDateTime(item.dueDate, item.dueTime) ?? "—"
  );

  if (items.length === 0) {
    return (
      <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ textAlign: "center", py: 8 }}>
          {isPractice && (
            <PracticeIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
          )}
          <Typography variant="h6" component="h2" color="text.secondary" gutterBottom>
            {emptyMessage.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {emptyMessage.description}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={20} />}
            onClick={onCreate}
          >
            {emptyMessage.buttonText}
          </Button>
        </Box>
      </Paper>
    );
  }

  if (isMobile) {
    return (
      <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
        <Stack divider={<Divider flexItem />} sx={{ width: "100%" }}>
          {items.map((item) => {
            const statusColor = getStatusColor(item);
            const statusText = getStatusText(item);
            const totalStudents = item.totalStudents ?? 0;
            const numerator = item.submissions ?? item.completions ?? 0;
            const completionRate =
              totalStudents > 0
                ? Math.round((numerator / totalStudents) * 100)
                : 0;
            const completionNode = (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="body2">
                  {numerator}/{totalStudents}
                </Typography>
                {completionRate === 100 && (
                  <CheckCircle size={16} color="#4caf50" />
                )}
              </Stack>
            );

            return (
              <Box key={item.id} sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    flexWrap="wrap"
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ minWidth: 0 }}
                    >
                      {isPractice && <PracticeIcon sx={{ fontSize: 16, color: "text.secondary" }} />}
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          cursor: "pointer",
                          wordBreak: "break-word",
                          "&:hover": {
                            color: "primary.main",
                            textDecoration: "underline",
                          },
                        }}
                        onClick={() => onView(item)}
                      >
                        {item.name}
                      </Typography>
                      {item.isLocked && <Lock size={14} color="#666" />}
                    </Stack>
                    <Chip
                      label={statusText}
                      color={statusColor}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      "& .due-date-pencil": {
                        opacity: 0,
                        transition: "opacity 0.15s ease",
                      },
                      "&:hover .due-date-pencil": { opacity: 1 },
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Due date
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {dueDateLabel(item)}
                      </Typography>
                      {onEditDueDate && (
                        <Tooltip title="Edit due date">
                          <IconButton
                            className="due-date-pencil"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditDueDate(item);
                            }}
                            sx={{ p: 0.25 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>

                  {isPractice ? (
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Attempts
                        </Typography>
                        <Typography variant="body2">{item.attempts}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Completions
                        </Typography>
                        {completionNode}
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Submissions
                        </Typography>
                        {completionNode}
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Average
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {item.submissions > 0 ? `${item.averageGrade}%` : "—"}
                        </Typography>
                      </Stack>
                    </Stack>
                  )}

                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Open Assignment">
                      <IconButton size="small" onClick={() => onView(item)}>
                        <FileEdit size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={item.isLocked ? "Unlock" : "Lock"}>
                      <IconButton
                        size="small"
                        onClick={() => onToggleLock(item.id)}
                        color={item.isLocked ? "default" : "warning"}
                      >
                        {item.isLocked ? (
                          <Lock size={18} />
                        ) : (
                          <Unlock size={18} />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="More Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => onMenuOpen(e, item)}
                      >
                        <MoreVertical size={18} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Table sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: "25%" }}>
                {isPractice ? "Name" : "Name"}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>
                Due Date & Time
              </TableCell>
              {isPractice ? (
                <>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Attempts
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Completions
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Submissions
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Average
                  </TableCell>
                </>
              )}
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const statusColor = getStatusColor(item);
              const statusText = getStatusText(item);
              const completionRate =
                item.totalStudents > 0
                  ? Math.round(
                      ((item.submissions || item.completions) /
                        item.totalStudents) *
                        100
                    )
                  : 0;

              return (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ width: "25%", overflow: "hidden" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, overflow: "hidden" }}>
                      {isPractice && <PracticeIcon sx={{ fontSize: 16, color: "text.secondary" }} />}
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        noWrap
                        sx={{
                          cursor: "pointer",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          "&:hover": {
                            color: "primary.main",
                            textDecoration: "underline",
                          },
                        }}
                        onClick={() => onView(item)}
                      >
                        {item.name}
                      </Typography>
                      {item.isLocked && <Lock size={14} color="#666" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusText}
                      color={statusColor}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        "& .due-date-pencil": {
                          opacity: 0,
                          transition: "opacity 0.15s ease",
                        },
                        "&:hover .due-date-pencil": { opacity: 1 },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          {dueDateLabel(item)}
                        </Typography>
                        {onEditDueDate && (
                          <Tooltip title="Edit due date">
                            <IconButton
                              className="due-date-pencil"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditDueDate(item);
                              }}
                              sx={{ p: 0.25 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  </TableCell>
                  {isPractice ? (
                    <>
                      <TableCell align="center">
                        <Typography variant="body2">{item.attempts}</Typography>
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
                          <Typography variant="body2">
                            {item.completions}/{item.totalStudents}
                          </Typography>
                          {completionRate === 100 && (
                            <CheckCircle size={16} color="#4caf50" />
                          )}
                        </Box>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {item.submissions}/{item.totalStudents}
                          </Typography>
                          {completionRate === 100 && (
                            <CheckCircle size={16} color="#4caf50" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>
                          {item.submissions > 0 ? `${item.averageGrade}%` : "—"}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="center"
                    >
                      <Tooltip title="Open Assignment">
                        <IconButton size="small" onClick={() => onView(item)}>
                          <FileEdit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={item.isLocked ? "Unlock" : "Lock"}>
                        <IconButton
                          size="small"
                          onClick={() => onToggleLock(item.id)}
                          color={item.isLocked ? "default" : "warning"}
                        >
                          {item.isLocked ? (
                            <Lock size={18} />
                          ) : (
                            <Unlock size={18} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => onMenuOpen(e, item)}
                        >
                          <MoreVertical size={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
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
