import { useState } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { Plus, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AssignmentTable from "../../components/ui/AssignmentTable";
import AssignmentFormDialog from "../../components/ui/AssignmentFormDialog";
import AssignmentContextMenu from "../../components/ui/AssignmentContextMenu";
import { sortAssignmentsBySubchapter } from "../../utils/assignmentSort.js";
import {
  getStatusColor,
  getStatusText,
  enhanceItems,
} from "../../utils/assignmentStatus";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";

const getCurrentEasternDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const INITIAL_FORM_DATA = {
  name: "",
  dueDate: "",
  dueTime: "23:59",
  publishDate: "",
  publishTime: "00:00",
  chapter: 1,
  subchapter: "A",
  isLocked: true,
  groupQuestionsByType: false,
  allowRetakes: true,
  showSolutions: true,
};

export default function InstructorPractice() {
  const {
    courseState,
    courseActions,
    assignmentPath,
    practicePath,
  } = useAppRuntime();
  const { activeCourseId, practicesByCourse, courses } = courseState;
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuPractice, setMenuPractice] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Get current course data
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const practices = sortAssignmentsBySubchapter(practicesByCourse[activeCourseId] || []);
  const enhancedPractices = enhanceItems(practices, activeCourse, [], true);

  const navigateToPractice = (practiceId) => {
    if (!practiceId) return;
    navigate(assignmentPath(practiceId), {
      state: { returnTo: practicePath },
    });
  };

  // Handlers
  const handleCreateOpen = (event) => {
    if (event?.currentTarget?.blur) {
      event.currentTarget.blur();
    }
    setFormData({
      ...INITIAL_FORM_DATA,
      publishDate: getCurrentEasternDate(),
    });
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const created = await courseActions.createPractice?.(activeCourseId, formData);
      setCreateDialogOpen(false);
      navigateToPractice(created?.id);
    } catch (error) {
      console.error("Failed to create practice", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditOpen = (practice) => {
    setSelectedPractice(practice);
    setFormData({
      name: practice.name,
      dueDate: practice.dueDate || "",
      dueTime: practice.dueTime || "23:59",
      publishDate: practice.publishDate || getCurrentEasternDate(),
      publishTime: practice.publishTime || "00:00",
      chapter: practice.chapter || 1,
      subchapter: practice.subchapter || "A",
      isLocked: practice.isLocked ?? false,
      groupQuestionsByType: practice.groupQuestionsByType ?? false,
      allowRetakes: practice.allowRetakes ?? true,
      showSolutions: practice.showSolutions ?? true,
    });
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditSubmit = async () => {
    try {
      await courseActions.updatePractice?.(activeCourseId, selectedPractice.id, formData);
      setEditDialogOpen(false);
      setSelectedPractice(null);
    } catch (error) {
      console.error("Failed to update practice", error);
    }
  };

  const handleToggleLock = async (practiceId) => {
    const practice = practices.find((p) => p.id === practiceId);
    if (!practice) return;
    try {
      await courseActions.togglePracticeLock?.(activeCourseId, practiceId, practice);
    } catch (error) {
      console.error("Failed to toggle lock", error);
    }
  };

  const handleTogglePublish = async (practiceId) => {
    const practice = practices.find((p) => p.id === practiceId);
    if (!practice) return;
    try {
      await courseActions.togglePracticePublish?.(activeCourseId, practiceId, practice);
    } catch (error) {
      console.error("Failed to toggle publish", error);
    }
  };

  const handleDuplicate = async (practice) => {
    try {
      await courseActions.duplicatePractice?.(activeCourseId, practice);
      setMenuAnchor(null);
    } catch (error) {
      console.error("Failed to duplicate practice", error);
    }
  };

  const handleDelete = async (practiceId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this practice assignment?"
      )
    ) {
      try {
        await courseActions.deletePractice?.(activeCourseId, practiceId);
      } catch (error) {
        console.error("Failed to delete practice", error);
      }
    }
    setMenuAnchor(null);
  };

  const handleViewPractice = (practice) => {
    navigateToPractice(practice?.id);
  };

  // Show message if no active course
  if (!activeCourseId) {
    return (
      <Box sx={{ width: "100%", maxWidth: "100%" }}>
        <Typography variant="h4" component="h1" fontWeight={600} mb={2}>
          Practice
        </Typography>
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
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
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
          sx={{ width: { xs: "100%", sm: "auto" } }}
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
        onOpenBuilder={handleViewPractice}
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
        isSubmitting={isCreating}
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
