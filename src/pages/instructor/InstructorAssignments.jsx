import { useState } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useCoursesState,
  useCoursesDispatch,
  calculateAssignmentAverage,
} from "../../context/CoursesContext";
import AssignmentTable from "../../components/ui/AssignmentTable";
import AssignmentFormDialog from "../../components/ui/AssignmentFormDialog";
import AssignmentContextMenu from "../../components/ui/AssignmentContextMenu";
import {
  getStatusColor,
  getStatusText,
  enhanceItems,
} from "../../utils/assignmentStatus";

// Helper to get current date
const getCurrentDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const INITIAL_FORM_DATA = {
  name: "",
  publishDate: getCurrentDate(),
  publishTime: "00:00",
  dueDate: getCurrentDate(),
  dueTime: "23:59",
  totalPoints: 100,
  isPublished: true,
  isLocked: false,
};

export default function InstructorAssignments() {
  const { activeCourseId, assignmentsByCourse, gradebookByCourse, courses } =
    useCoursesState();
  const dispatch = useCoursesDispatch();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAssignment, setMenuAssignment] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Get current course data
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const assignments = assignmentsByCourse[activeCourseId] || [];
  const gradebook = gradebookByCourse[activeCourseId] || [];

  // Enhance assignments with calculated data
  const enhancedAssignments = enhanceItems(
    assignments,
    activeCourse,
    gradebook,
    false
  ).map((assignment) => {
    const average = calculateAssignmentAverage(assignment.id, gradebook);
    const submissions = gradebook.filter(
      (student) => student.grades[assignment.id] !== undefined
    ).length;

    return {
      ...assignment,
      averageGrade: average,
      submissions,
    };
  });

  // Handlers
  const handleCreateOpen = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      publishDate: getCurrentDate(),
      dueDate: getCurrentDate(),
    });
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    const newAssignment = {
      id: `a${assignments.length + 1}`,
      courseId: activeCourseId,
      name: formData.name,
      publishDate: formData.publishDate,
      publishTime: formData.publishTime,
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      totalPoints: formData.totalPoints,
      isPublished: formData.isPublished,
      isLocked: formData.isLocked,
      submissions: 0,
      lateSubmissions: 0,
    };

    dispatch({
      type: "SET_ASSIGNMENTS",
      courseId: activeCourseId,
      payload: [...assignments, newAssignment],
    });

    setCreateDialogOpen(false);
    navigate("/instructor/assignment-builder", {
      state: { assignmentId: newAssignment.id },
    });
  };

  const handleEditOpen = (assignment) => {
    setSelectedAssignment(assignment);

    setFormData({
      name: assignment.name,
      publishDate: assignment.publishDate || getCurrentDate(),
      publishTime: assignment.publishTime || "00:00",
      dueDate: assignment.dueDate || getCurrentDate(),
      dueTime: assignment.dueTime || "23:59",
      totalPoints: assignment.totalPoints || 100,
      isPublished: assignment.isPublished ?? true,
      isLocked: assignment.isLocked ?? false,
    });

    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditSubmit = () => {
    const updatedAssignments = assignments.map((a) =>
      a.id === selectedAssignment.id
        ? {
            ...a,
            name: formData.name,
            publishDate: formData.publishDate,
            publishTime: formData.publishTime,
            dueDate: formData.dueDate,
            dueTime: formData.dueTime,
            totalPoints: formData.totalPoints,
            isPublished: formData.isPublished,
            isLocked: formData.isLocked,
          }
        : a
    );

    dispatch({
      type: "SET_ASSIGNMENTS",
      courseId: activeCourseId,
      payload: updatedAssignments,
    });

    setEditDialogOpen(false);
    setSelectedAssignment(null);
  };

  const handleToggleLock = (assignmentId) => {
    const updatedAssignments = assignments.map((a) =>
      a.id === assignmentId ? { ...a, isLocked: !a.isLocked } : a
    );

    dispatch({
      type: "SET_ASSIGNMENTS",
      courseId: activeCourseId,
      payload: updatedAssignments,
    });
  };

  const handleTogglePublish = (assignmentId) => {
    const updatedAssignments = assignments.map((a) =>
      a.id === assignmentId ? { ...a, isPublished: !a.isPublished } : a
    );

    dispatch({
      type: "SET_ASSIGNMENTS",
      courseId: activeCourseId,
      payload: updatedAssignments,
    });
  };

  const handleDuplicate = (assignment) => {
    const newAssignment = {
      ...assignment,
      id: `a${assignments.length + 1}`,
      name: `${assignment.name} (Copy)`,
      submissions: 0,
      lateSubmissions: 0,
      isPublished: false,
    };

    dispatch({
      type: "SET_ASSIGNMENTS",
      courseId: activeCourseId,
      payload: [...assignments, newAssignment],
    });

    setMenuAnchor(null);
  };

  const handleDelete = (assignmentId) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      const updatedAssignments = assignments.filter(
        (a) => a.id !== assignmentId
      );

      dispatch({
        type: "SET_ASSIGNMENTS",
        courseId: activeCourseId,
        payload: updatedAssignments,
      });
    }
    setMenuAnchor(null);
  };

  const handleViewAssignment = (assignment) => {
    navigate("/instructor/assignment-builder", {
      state: { assignmentId: assignment.id },
    });
  };

  const handleOpenBuilder = (assignment) => {
    navigate("/instructor/assignment-builder", {
      state: { assignmentId: assignment.id },
    });
    setMenuAnchor(null);
  };

  // Show message if no active course
  if (!activeCourseId) {
    return (
      <Box sx={{ width: "100%", maxWidth: "100%" }}>
        <Alert severity="info">
          Please select a course to view and manage assignments.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      {/* Header */}
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
            {activeCourse?.code} - Create and manage course assignments
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

      {/* Table */}
      <AssignmentTable
        items={enhancedAssignments}
        type="assignment"
        onView={handleViewAssignment}
        onToggleLock={handleToggleLock}
        onTogglePublish={handleTogglePublish}
        onMenuOpen={(e, assignment) => {
          setMenuAnchor(e.currentTarget);
          setMenuAssignment(assignment);
        }}
        onCreate={handleCreateOpen}
        emptyMessage={{
          title: "No assignments yet",
          description: "Create your first assignment to get started",
          buttonText: "Create Assignment",
        }}
        getStatusColor={(item) => getStatusColor(item, false)}
        getStatusText={(item) => getStatusText(item, false)}
      />

      {/* Context Menu */}
      <AssignmentContextMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        item={menuAssignment}
        onOpenBuilder={handleOpenBuilder}
        onEdit={handleEditOpen}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      {/* Create Dialog */}
      <AssignmentFormDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateSubmit}
        formData={formData}
        setFormData={setFormData}
        mode="create"
        type="assignment"
      />

      {/* Edit Dialog */}
      <AssignmentFormDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedAssignment(null);
        }}
        onSubmit={handleEditSubmit}
        formData={formData}
        setFormData={setFormData}
        mode="edit"
        type="assignment"
      />
    </Box>
  );
}
