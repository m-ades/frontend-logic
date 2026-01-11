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
  Switch,
  IconButton,
  Tooltip,
  Stack,
  Button,
} from "@mui/material";
import {
  Lock,
  Unlock,
  MoreVertical,
  FileEdit,
  CheckCircle,
  Plus,
  Brain,
} from "lucide-react";

// Helper function to format date and time
function formatDateTime(dateString, timeString) {
  if (!dateString) return "—";

  const date = new Date(dateString);
  const dateFormatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!timeString) return dateFormatted;

  // Parse time string (HH:mm format)
  const [hours, minutes] = timeString.split(":");
  const timeFormatted = new Date(
    2000,
    0,
    1,
    parseInt(hours),
    parseInt(minutes)
  ).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateFormatted} at ${timeFormatted}`;
}

export default function AssignmentTable({
  items,
  type = "assignment",
  onView,
  onToggleLock,
  onTogglePublish,
  onMenuOpen,
  onCreate,
  emptyMessage,
  getStatusColor,
  getStatusText,
}) {
  const isPractice = type === "practice";

  if (items.length === 0) {
    return (
      <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ textAlign: "center", py: 8 }}>
          {isPractice && (
            <Brain size={48} color="#999" style={{ marginBottom: 16 }} />
          )}
          <Typography variant="h6" color="text.secondary" gutterBottom>
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

  return (
    <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>
                {isPractice ? "Name" : "Name"}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Published
              </TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>
                Publish Date & Time
              </TableCell>
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
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Retakes
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Solutions
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
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Points
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
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {isPractice && <Brain size={16} color="#666" />}
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          cursor: "pointer",
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
                  <TableCell align="center">
                    <Switch
                      checked={item.isPublished}
                      onChange={() => onTogglePublish(item.id)}
                      size="small"
                      disabled={item.isLocked}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(item.publishDate, item.publishTime)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(item.dueDate, item.dueTime)}
                    </Typography>
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
                      <TableCell align="center">
                        <Chip
                          label={item.allowRetakes ? "Allowed" : "Disabled"}
                          color={item.allowRetakes ? "success" : "default"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={item.showSolutions ? "Visible" : "Hidden"}
                          color={item.showSolutions ? "info" : "default"}
                          size="small"
                          variant="outlined"
                        />
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
                      <TableCell align="center">
                        <Typography variant="body2">
                          {item.totalPoints}
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
                      <Tooltip title="Open Builder">
                        <IconButton size="small" onClick={() => onView(item)}>
                          <FileEdit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={item.isLocked ? "Unlock" : "Lock"}>
                        <IconButton
                          size="small"
                          onClick={() => onToggleLock(item.id)}
                          color={item.isLocked ? "warning" : "default"}
                        >
                          {item.isLocked ? (
                            <Unlock size={18} />
                          ) : (
                            <Lock size={18} />
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
