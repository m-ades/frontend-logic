import { useState } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { Plus, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useCoursesState,
  useCoursesDispatch,
  fetchCoursePractices,
} from "../../context/CoursesContext";
import { fetchJson } from "../../utils/api.js";
import AssignmentTable from "../../components/ui/AssignmentTable";
import AssignmentFormDialog from "../../components/ui/AssignmentFormDialog";
import AssignmentContextMenu from "../../components/ui/AssignmentContextMenu";
import { sortAssignmentsBySubchapter } from "../../utils/assignmentSort.js";
import {
  getStatusColor,
  getStatusText,
  enhanceItems,
} from "../../utils/assignmentStatus";

const getCurrentEasternDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const INITIAL_FORM_DATA = {
  name: "",
  dueDate: "",
  dueTime: "23:59",
  publishDate: "",
  publishTime: "00:00",
  totalPoints: 0,
  chapter: 1,
  subchapter: "A",
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
  const practices = sortAssignmentsBySubchapter(practicesByCourse[activeCourseId] || []);
  const enhancedPractices = enhanceItems(practices, activeCourse, [], true);

  const navigateToPractice = (practiceId) => {
    if (!practiceId) return;
    navigate(`/instructor/assignment/${practiceId}`, {
      state: { returnTo: "/instructor/practice" },
    });
  };

  // Handlers
  const handleCreateOpen = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      publishDate: getCurrentEasternDate(),
    });
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const payload = {
        course_id: activeCourseId,
        kind: "practice",
        title: formData.name,
        description: formData.description || null,
        is_locked: formData.isLocked || !formData.isPublished,
        chapter: Number(formData.chapter) || 1,
        subchapter: formData.subchapter || "A",
        due_date: null,
        late_window_days: null,
        late_penalty_percent: null,
        total_points: Number.isFinite(formData.totalPoints)
          ? formData.totalPoints
          : 0,
      };
      const created = await fetchJson("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const refreshed = await fetchCoursePractices(activeCourseId);
      dispatch({
        type: "SET_PRACTICES",
        courseId: activeCourseId,
        payload: refreshed,
      });
      setCreateDialogOpen(false);
      navigateToPractice(created?.id ?? payload.id);
    } catch (error) {
      console.error("Failed to create practice", error);
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
      totalPoints: practice.totalPoints ?? 0,
      chapter: practice.chapter || 1,
      subchapter: practice.subchapter || "A",
      isPublished: practice.isPublished ?? true,
      isLocked: practice.isLocked ?? false,
      allowRetakes: practice.allowRetakes ?? true,
      showSolutions: practice.showSolutions ?? true,
    });
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditSubmit = async () => {
    try {
      const payload = {
        course_id: activeCourseId,
        kind: "practice",
        title: formData.name,
        description: formData.description || null,
        is_locked: formData.isLocked || !formData.isPublished,
        chapter: Number(formData.chapter) || 1,
        subchapter: formData.subchapter || "A",
        due_date: null,
        late_window_days: null,
        late_penalty_percent: null,
        total_points: Number.isFinite(formData.totalPoints)
          ? formData.totalPoints
          : 0,
      };
      await fetchJson(`/api/assignments/${selectedPractice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const refreshed = await fetchCoursePractices(activeCourseId);
      dispatch({
        type: "SET_PRACTICES",
        courseId: activeCourseId,
        payload: refreshed,
      });
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
      await fetchJson(`/api/assignments/${practiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: !practice.isLocked }),
      });
      const refreshed = await fetchCoursePractices(activeCourseId);
      dispatch({
        type: "SET_PRACTICES",
        courseId: activeCourseId,
        payload: refreshed,
      });
    } catch (error) {
      console.error("Failed to toggle lock", error);
    }
  };

  const handleTogglePublish = async (practiceId) => {
    const practice = practices.find((p) => p.id === practiceId);
    if (!practice) return;
    const nextPublished = !practice.isPublished;
    try {
      await fetchJson(`/api/assignments/${practiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: practice.isLocked || !nextPublished }),
      });
      const refreshed = await fetchCoursePractices(activeCourseId);
      dispatch({
        type: "SET_PRACTICES",
        courseId: activeCourseId,
        payload: refreshed,
      });
    } catch (error) {
      console.error("Failed to toggle publish", error);
    }
  };

  const handleDuplicate = async (practice) => {
    try {
      const payload = {
        course_id: activeCourseId,
        kind: "practice",
        title: `${practice.name} (Copy)`,
        description: practice.description || null,
        is_locked: true,
        chapter: practice.chapter || 1,
        subchapter: practice.subchapter || "A",
        due_date: null,
        late_window_days: null,
        late_penalty_percent: null,
        total_points: Number.isFinite(practice.totalPoints)
          ? practice.totalPoints
          : 0,
      };
      await fetchJson("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const refreshed = await fetchCoursePractices(activeCourseId);
      dispatch({
        type: "SET_PRACTICES",
        courseId: activeCourseId,
        payload: refreshed,
      });
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
        await fetchJson(`/api/assignments/${practiceId}`, {
          method: "DELETE",
        });
        const refreshed = await fetchCoursePractices(activeCourseId);
        dispatch({
          type: "SET_PRACTICES",
          courseId: activeCourseId,
          payload: refreshed,
        });
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
