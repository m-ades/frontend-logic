import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Menu,
} from "@mui/material";
import {
  Plus,
  Eye,
  Lock,
  Unlock,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Users,
  CheckCircle,
} from "lucide-react";

// Mock assignments data - replace with context data
const mockAssignments = [
  {
    id: "a1",
    name: "Assignment 1",
    dueDate: "2026-01-15",
    publishDate: "2026-01-08",
    isLocked: false,
    isPublished: true,
    totalPoints: 100,
    submissions: 28,
    totalStudents: 30,
    averageGrade: 87,
  },
  {
    id: "a2",
    name: "Assignment 2",
    dueDate: "2026-01-22",
    publishDate: "2026-01-15",
    isLocked: false,
    isPublished: true,
    totalPoints: 100,
    submissions: 29,
    totalStudents: 30,
    averageGrade: 82,
  },
  {
    id: "a3",
    name: "Assignment 3",
    dueDate: "2026-01-29",
    publishDate: "2026-01-22",
    isLocked: false,
    isPublished: false,
    totalPoints: 100,
    submissions: 0,
    totalStudents: 30,
    averageGrade: 0,
  },
];

const getStatusColor = (assignment) => {
  const now = new Date();
  const dueDate = new Date(assignment.dueDate);
  const publishDate = new Date(assignment.publishDate);

  if (assignment.isLocked) return "default";
  if (!assignment.isPublished || publishDate > now) return "warning";
  if (dueDate < now) return "error";
  return "success";
};

const getStatusText = (assignment) => {
  const now = new Date();
  const dueDate = new Date(assignment.dueDate);
  const publishDate = new Date(assignment.publishDate);

  if (assignment.isLocked) return "Locked";
  if (!assignment.isPublished) return "Draft";
  if (publishDate > now) return "Scheduled";
  if (dueDate < now) return "Past Due";
  return "Active";
};

export default function InstructorAssignments() {
  const [assignments, setAssignments] = useState(mockAssignments);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAssignment, setMenuAssignment] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    dueDate: "",
    publishDate: "",
    totalPoints: 100,
    isPublished: true,
    isLocked: false,
  });

  const handleCreateOpen = () => {
    setFormData({
      name: "",
      dueDate: "",
      publishDate: "",
      totalPoints: 100,
      isPublished: true,
      isLocked: false,
    });
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
  };

  const handleCreateSubmit = () => {
    const newAssignment = {
      id: `a${assignments.length + 1}`,
      ...formData,
      submissions: 0,
      totalStudents: 30,
      averageGrade: 0,
    };
    setAssignments([...assignments, newAssignment]);
    setCreateDialogOpen(false);
  };

  const handleEditOpen = (assignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      name: assignment.name,
      dueDate: assignment.dueDate,
      publishDate: assignment.publishDate,
      totalPoints: assignment.totalPoints,
      isPublished: assignment.isPublished,
      isLocked: assignment.isLocked,
    });
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedAssignment(null);
  };

  const handleEditSubmit = () => {
    setAssignments(
      assignments.map((a) =>
        a.id === selectedAssignment.id ? { ...a, ...formData } : a
      )
    );
    setEditDialogOpen(false);
    setSelectedAssignment(null);
  };

  const handleToggleLock = (assignmentId) => {
    setAssignments(
      assignments.map((a) =>
        a.id === assignmentId ? { ...a, isLocked: !a.isLocked } : a
      )
    );
  };

  const handleTogglePublish = (assignmentId) => {
    setAssignments(
      assignments.map((a) =>
        a.id === assignmentId ? { ...a, isPublished: !a.isPublished } : a
      )
    );
  };

  const handleDuplicate = (assignment) => {
    const newAssignment = {
      ...assignment,
      id: `a${assignments.length + 1}`,
      name: `${assignment.name} (Copy)`,
      submissions: 0,
      averageGrade: 0,
      isPublished: false,
    };
    setAssignments([...assignments, newAssignment]);
    setMenuAnchor(null);
  };

  const handleDelete = (assignmentId) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
    }
    setMenuAnchor(null);
  };

  const handleViewAssignment = (assignment) => {
    console.log("View assignment:", assignment.id);
    alert(`View ${assignment.name} - Navigate to assignment details page`);
  };

  const handleMenuOpen = (event, assignment) => {
    setMenuAnchor(event.currentTarget);
    setMenuAssignment(assignment);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuAssignment(null);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Assignments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage course assignments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleCreateOpen}
        >
          Create Assignment
        </Button>
      </Box>

      {/* Assignments Table */}
      <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Assignment Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Published
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Publish Date
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Due Date
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Submissions
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Average
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Points
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => {
                const statusColor = getStatusColor(assignment);
                const statusText = getStatusText(assignment);
                const completionRate = Math.round(
                  (assignment.submissions / assignment.totalStudents) * 100
                );

                return (
                  <TableRow key={assignment.id} hover>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          {assignment.name}
                        </Typography>
                        {assignment.isLocked && <Lock size={14} color="#666" />}
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
                        checked={assignment.isPublished}
                        onChange={() => handleTogglePublish(assignment.id)}
                        size="small"
                        disabled={assignment.isLocked}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {new Date(assignment.publishDate).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </Typography>
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
                          {assignment.submissions}/{assignment.totalStudents}
                        </Typography>
                        {completionRate === 100 && (
                          <CheckCircle size={16} color="#4caf50" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {assignment.submissions > 0
                          ? `${assignment.averageGrade}%`
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {assignment.totalPoints}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="center"
                      >
                        <Tooltip title="View Assignment">
                          <IconButton
                            size="small"
                            onClick={() => handleViewAssignment(assignment)}
                          >
                            <Eye size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={assignment.isLocked ? "Unlock" : "Lock"}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleToggleLock(assignment.id)}
                            color={assignment.isLocked ? "warning" : "default"}
                          >
                            {assignment.isLocked ? (
                              <Unlock size={18} />
                            ) : (
                              <Lock size={18} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="More Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, assignment)}
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

        {assignments.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No assignments yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Create your first assignment to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={handleCreateOpen}
            >
              Create Assignment
            </Button>
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEditOpen(menuAssignment)}>
          <Edit size={16} style={{ marginRight: 8 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleDuplicate(menuAssignment)}>
          <Copy size={16} style={{ marginRight: 8 }} />
          Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => handleDelete(menuAssignment?.id)}
          sx={{ color: "error.main" }}
        >
          <Trash2 size={16} style={{ marginRight: 8 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Assignment Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Assignment</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Assignment Name"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <TextField
              label="Total Points"
              type="number"
              fullWidth
              value={formData.totalPoints}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalPoints: parseInt(e.target.value) || 0,
                })
              }
              required
            />

            <TextField
              label="Publish Date"
              type="date"
              fullWidth
              value={formData.publishDate}
              onChange={(e) =>
                setFormData({ ...formData, publishDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              required
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublished}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublished: e.target.checked })
                  }
                />
              }
              label="Publish immediately"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isLocked}
                  onChange={(e) =>
                    setFormData({ ...formData, isLocked: e.target.checked })
                  }
                />
              }
              label="Lock assignment (prevent submissions)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>Cancel</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={
              !formData.name || !formData.dueDate || !formData.publishDate
            }
          >
            Create Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Assignment</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Assignment Name"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <TextField
              label="Total Points"
              type="number"
              fullWidth
              value={formData.totalPoints}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalPoints: parseInt(e.target.value) || 0,
                })
              }
              required
            />

            <TextField
              label="Publish Date"
              type="date"
              fullWidth
              value={formData.publishDate}
              onChange={(e) =>
                setFormData({ ...formData, publishDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              required
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublished}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublished: e.target.checked })
                  }
                />
              }
              label="Published"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isLocked}
                  onChange={(e) =>
                    setFormData({ ...formData, isLocked: e.target.checked })
                  }
                />
              }
              label="Locked (prevent submissions)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={
              !formData.name || !formData.dueDate || !formData.publishDate
            }
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
