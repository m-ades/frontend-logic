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
  Divider,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Lock,
  Unlock,
  MoreVertical,
  FileEdit,
  CheckCircle,
  Plus,
  Brain,
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
  onCreate,
  emptyMessage,
  getStatusColor,
  getStatusText,
}) {
  const isPractice = type === "practice";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
                      {isPractice && <Brain size={16} color="#666" />}
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

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Published
                    </Typography>
                    <Switch
                      checked={item.isPublished}
                      onChange={() => onTogglePublish(item.id)}
                      size="small"
                      disabled={item.isLocked}
                    />
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Publish date
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatEasternDateTime(item.publishDate, item.publishTime) ?? "—"}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Due date
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatEasternDateTime(item.dueDate, item.dueTime) ?? "—"}
                    </Typography>
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
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Retakes
                        </Typography>
                        <Chip
                          label={item.allowRetakes ? "Allowed" : "Disabled"}
                          color={item.allowRetakes ? "success" : "default"}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Solutions
                        </Typography>
                        <Chip
                          label={item.showSolutions ? "Visible" : "Hidden"}
                          color={item.showSolutions ? "info" : "default"}
                          size="small"
                          variant="outlined"
                        />
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
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Points
                        </Typography>
                        <Typography variant="body2">{item.totalPoints}</Typography>
                      </Stack>
                    </Stack>
                  )}

                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
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
                      {formatEasternDateTime(item.publishDate, item.publishTime) ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatEasternDateTime(item.dueDate, item.dueTime) ?? "—"}
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
