import { useState } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { Plus, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useCoursesState,
  useCoursesDispatch,
} from "../../context/CoursesContext";
import AssignmentTable from "../../components/ui/AssignmentTable";
import AssignmentFormDialog from "../../components/ui/AssignmentFormDialog";
import AssignmentContextMenu from "../../components/ui/AssignmentContextMenu";
import {
  getStatusColor,
  getStatusText,
  enhanceItems,
} from "../../utils/assignmentStatus";

const INITIAL_FORM_DATA = {
  name: "",
  dueDate: "",
  publishDate: "",
  isPublished: true,
  isLocked: false,
  allowRetakes: true,
  showSolutions: true,
};

export default function InstructorPractice() {
  const { activeCourseId, practicesByCourse, courses } = useCoursesState();
  const dispatch = useCoursesDispatch();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuPractice, setMenuPractice] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Get current course data
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const practices = practicesByCourse[activeCourseId] || [];
  const enhancedPractices = enhanceItems(practices, activeCourse, [], true);

  // Handlers
  const handleCreateOpen = () => {
    setFormData(INITIAL_FORM_DATA);
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    const newPractice = {
      id: `p${practices.length + 1}`,
      courseId: activeCourseId,
      ...formData,
      attempts: 0,
      completions: 0,
      type: "practice",
    };

    dispatch({
      type: "SET_PRACTICES",
      courseId: activeCourseId,
      payload: [...practices, newPractice],
    });

    setCreateDialogOpen(false);
    navigate("/instructor/assignment-builder", {
      state: { practiceId: newPractice.id },
    });
  };

  const handleEditOpen = (practice) => {
    setSelectedPractice(practice);
    setFormData({
      name: practice.name,
      dueDate: practice.dueDate.split("T")[0],
      publishDate: practice.publishDate.split("T")[0],
      isPublished: practice.isPublished,
      isLocked: practice.isLocked,
      allowRetakes: practice.allowRetakes,
      showSolutions: practice.showSolutions,
    });
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditSubmit = () => {
    const updatedPractices = practices.map((p) =>
      p.id === selectedPractice.id
        ? {
            ...p,
            ...formData,
            dueDate: `${formData.dueDate}T23:59:00Z`,
            publishDate: `${formData.publishDate}T00:00:00Z`,
          }
        : p
    );

    dispatch({
      type: "SET_PRACTICES",
      courseId: activeCourseId,
      payload: updatedPractices,
    });

    setEditDialogOpen(false);
    setSelectedPractice(null);
  };

  const handleToggleLock = (practiceId) => {
    const updatedPractices = practices.map((p) =>
      p.id === practiceId ? { ...p, isLocked: !p.isLocked } : p
    );

    dispatch({
      type: "SET_PRACTICES",
      courseId: activeCourseId,
      payload: updatedPractices,
    });
  };

  const handleTogglePublish = (practiceId) => {
    const updatedPractices = practices.map((p) =>
      p.id === practiceId ? { ...p, isPublished: !p.isPublished } : p
    );

    dispatch({
      type: "SET_PRACTICES",
      courseId: activeCourseId,
      payload: updatedPractices,
    });
  };

  const handleDuplicate = (practice) => {
    const newPractice = {
      ...practice,
      id: `p${practices.length + 1}`,
      name: `${practice.name} (Copy)`,
      attempts: 0,
      completions: 0,
      isPublished: false,
    };

    dispatch({
      type: "SET_PRACTICES",
      courseId: activeCourseId,
      payload: [...practices, newPractice],
    });

    setMenuAnchor(null);
  };

  const handleDelete = (practiceId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this practice assignment?"
      )
    ) {
      const updatedPractices = practices.filter((p) => p.id !== practiceId);

      dispatch({
        type: "SET_PRACTICES",
        courseId: activeCourseId,
        payload: updatedPractices,
      });
    }
    setMenuAnchor(null);
  };

  const handleViewPractice = (practice) => {
    navigate("/instructor/assignment-builder", {
      state: { practiceId: practice.id },
    });
  };

  const handleOpenBuilder = (practice) => {
    navigate("/instructor/assignment-builder", {
      state: { practiceId: practice.id },
    });
    setMenuAnchor(null);
  };

  // Show message if no active course
  if (!activeCourseId) {
    return (
      <Box sx={{ width: "100%", maxWidth: "100%" }}>
        <Alert severity="info">
          Please select a course to view and manage practice assignments.
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
          <Typography
            variant="h4"
            fontWeight={600}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Brain size={32} />
            Practice
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeCourse?.code} - Create practice assignments that don't count
            towards grades
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleCreateOpen}
        >
          Create Practice
        </Button>
      </Box>

      {/* Table */}
      <AssignmentTable
        items={enhancedPractices}
        type="practice"
        onView={handleViewPractice}
        onToggleLock={handleToggleLock}
        onTogglePublish={handleTogglePublish}
        onMenuOpen={(e, practice) => {
          setMenuAnchor(e.currentTarget);
          setMenuPractice(practice);
        }}
        onCreate={handleCreateOpen}
        emptyMessage={{
          title: "No practice assignments yet",
          description:
            "Create your first practice assignment to help students learn",
          buttonText: "Create Practice",
        }}
        getStatusColor={(item) => getStatusColor(item, true)}
        getStatusText={(item) => getStatusText(item, true)}
      />

      {/* Context Menu */}
      <AssignmentContextMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        item={menuPractice}
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
        type="practice"
      />

      {/* Edit Dialog */}
      <AssignmentFormDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedPractice(null);
        }}
        onSubmit={handleEditSubmit}
        formData={formData}
        setFormData={setFormData}
        mode="edit"
        type="practice"
      />
    </Box>
  );
}
