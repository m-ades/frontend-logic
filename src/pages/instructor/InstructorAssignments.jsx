import { useCallback, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  calculateAssignmentAverage,
} from "../../context/CoursesContext";
import AssignmentTable from "../../components/ui/AssignmentTable";
import AssignmentFormDialog from "../../components/ui/AssignmentFormDialog";
import AssignmentContextMenu from "../../components/ui/AssignmentContextMenu";
import ClasswideExtensionDialog from "../../components/ui/assignments/ClasswideExtensionDialog";
import AssignmentExtensionsDialog from "../../components/ui/assignments/AssignmentExtensionsDialog";
import { sortAssignmentsBySubchapter } from "../../utils/assignmentSort.js";
import { toEasternIso } from "../../utils/easternTime.js";
import {
  getStatusColor,
  getStatusText,
  enhanceItems,
} from "../../utils/assignmentStatus";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";

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
  chapter: 1,
  subchapter: "",
  isLocked: false,
};

export default function InstructorAssignments() {
  const {
    courseState,
    courseActions,
    assignmentPath,
    assignmentBuilderPath,
    isSandbox,
  } = useAppRuntime();
  const { activeCourseId, assignmentsByCourse, gradebookByCourse, courses } = courseState;
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAssignment, setMenuAssignment] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const [dueDateEditAssignment, setDueDateEditAssignment] = useState(null);
  const [dueDateForm, setDueDateForm] = useState({ dueDate: "", dueTime: "23:59" });
  const [extensionAssignment, setExtensionAssignment] = useState(null);
  const [classwideOpen, setClasswideOpen] = useState(false);
  const [extensionsListOpen, setExtensionsListOpen] = useState(false);
  const [classwideForm, setClasswideForm] = useState({
    dueDate: "",
    dueTime: "23:59",
    reason: "",
  });
  const [classwideSaving, setClasswideSaving] = useState(false);
  const [classwideError, setClasswideError] = useState("");

  // Get current course data
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const assignments = sortAssignmentsBySubchapter(assignmentsByCourse[activeCourseId] || []);
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
      (student) => Boolean(student.submittedAssignments?.[assignment.id])
    ).length;

    return {
      ...assignment,
      averageGrade: average,
      submissions,
    };
  });

  // Handlers
  const handleCreateOpen = (event) => {
    if (event?.currentTarget?.blur) {
      event.currentTarget.blur();
    }
    setFormData({
      ...INITIAL_FORM_DATA,
      publishDate: getCurrentDate(),
      dueDate: getCurrentDate(),
    });
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const created = await courseActions.createAssignment?.(activeCourseId, formData);
      setCreateDialogOpen(false);
      if (!isSandbox && created?.id) {
        navigate(assignmentBuilderPath, {
          state: { assignmentId: created.id },
        });
      }
    } catch (error) {
      console.error("Failed to create assignment", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditOpen = (assignment) => {
    setSelectedAssignment(assignment);

    setFormData({
      name: assignment.name,
      publishDate: assignment.publishDate || getCurrentDate(),
      publishTime: assignment.publishTime || "00:00",
      dueDate: assignment.dueDate || getCurrentDate(),
      dueTime: assignment.dueTime || "23:59",
      chapter: assignment.chapter || 1,
      subchapter: assignment.subchapter || "",
      isLocked: assignment.isLocked ?? false,
    });

    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditSubmit = async () => {
    try {
      await courseActions.updateAssignment?.(activeCourseId, selectedAssignment.id, formData);
      setEditDialogOpen(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error("Failed to update assignment", error);
    }
  };

  const handleToggleLock = async (assignmentId) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    try {
      await courseActions.toggleAssignmentLock?.(activeCourseId, assignmentId, assignment);
    } catch (error) {
      console.error("Failed to toggle lock", error);
    }
  };

  const handleTogglePublish = async (assignmentId) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    try {
      await courseActions.toggleAssignmentPublish?.(activeCourseId, assignmentId, assignment);
    } catch (error) {
      console.error("Failed to toggle publish", error);
    }
  };

  const handleDuplicate = async (assignment) => {
    try {
      await courseActions.duplicateAssignment?.(activeCourseId, assignment);
      setMenuAnchor(null);
    } catch (error) {
      console.error("Failed to duplicate assignment", error);
    }
  };

  const handleDelete = async (assignmentId) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await courseActions.deleteAssignment?.(activeCourseId, assignmentId);
      } catch (error) {
        console.error("Failed to delete assignment", error);
      }
    }
    setMenuAnchor(null);
  };

  const handleViewAssignment = (assignment) => {
    if (isSandbox) {
      navigate(assignmentPath(assignment.id));
      return;
    }
    navigate(assignmentBuilderPath, { state: { assignmentId: assignment.id } });
  };

  const handleOpenBuilder = (assignment) => {
    if (isSandbox) {
      navigate(assignmentPath(assignment.id));
    } else {
      navigate(assignmentBuilderPath, { state: { assignmentId: assignment.id } });
    }
    setMenuAnchor(null);
  };

  const handleEditDueDateOpen = (assignment) => {
    setDueDateEditAssignment(assignment);
    setDueDateForm({
      dueDate: assignment.dueDate || getCurrentDate(),
      dueTime: assignment.dueTime || "23:59",
    });
    setDueDateDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditDueDateSubmit = async () => {
    if (!dueDateEditAssignment?.id || !dueDateForm.dueDate) return;
    try {
      await courseActions.updateAssignmentDueDate?.(
        activeCourseId,
        dueDateEditAssignment.id,
        dueDateForm.dueDate,
        dueDateForm.dueTime || "23:59"
      );
      setDueDateDialogOpen(false);
      setDueDateEditAssignment(null);
    } catch (error) {
      console.error("Failed to update due date", error);
    }
  };

  const loadAssignmentExtensions = useCallback(
    (assignmentId) =>
      courseActions.getAssignmentExtensions?.(assignmentId) ?? Promise.resolve([]),
    [courseActions]
  );

  const handleOpenClasswideExtension = (assignment) => {
    if (!assignment?.id) return;
    setExtensionAssignment(assignment);
    setClasswideForm({
      dueDate: assignment.dueDate || getCurrentDate(),
      dueTime: assignment.dueTime || "23:59",
      reason: "",
    });
    setClasswideError("");
    setClasswideOpen(true);
  };

  const handleOpenExtensionsList = (assignment) => {
    if (!assignment?.id) return;
    setExtensionAssignment(assignment);
    setExtensionsListOpen(true);
  };

  const handleClasswideSubmit = async () => {
    if (classwideSaving || !extensionAssignment?.id || !classwideForm.dueDate) return;
    const iso = toEasternIso(classwideForm.dueDate, classwideForm.dueTime || "23:59");
    if (!iso) {
      setClasswideError("Choose a valid date and time.");
      return;
    }
    if (typeof courseActions.saveClasswideExtension !== "function") {
      setClasswideError("Classwide extensions are not available.");
      return;
    }
    setClasswideSaving(true);
    setClasswideError("");
    try {
      const result = await courseActions.saveClasswideExtension(extensionAssignment.id, {
        extendedDueDate: iso,
        reason: classwideForm.reason?.trim().slice(0, 500) || null,
      });
      if ((result?.total ?? 0) === 0) {
        setClasswideError("No enrolled students to extend.");
        return;
      }
      setClasswideOpen(false);
      setExtensionsListOpen(true);
    } catch (error) {
      setClasswideError(error?.message || "Failed to apply classwide extension.");
    } finally {
      setClasswideSaving(false);
    }
  };

  // Show message if no active course
  if (!activeCourseId) {
    return (
      <Box sx={{ width: "100%", maxWidth: "100%" }}>
        <Typography variant="h4" component="h1" fontWeight={600} mb={2}>
          Assignments
        </Typography>
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
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600}>
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
          sx={{ width: { xs: "100%", sm: "auto" } }}
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
        onEditDueDate={handleEditDueDateOpen}
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
        onClasswideExtension={handleOpenClasswideExtension}
        onViewExtensions={handleOpenExtensionsList}
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

      {/* Edit due date dialog */}
      <Dialog
        open={dueDateDialogOpen}
        onClose={() => {
          setDueDateDialogOpen(false);
          setDueDateEditAssignment(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit due date</DialogTitle>
        <DialogContent>
          {dueDateEditAssignment && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {dueDateEditAssignment.name}
            </Typography>
          )}
          <TextField
            label="Due date"
            type="date"
            value={dueDateForm.dueDate}
            onChange={(e) =>
              setDueDateForm((prev) => ({ ...prev, dueDate: e.target.value }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Due time"
            type="time"
            value={dueDateForm.dueTime}
            onChange={(e) =>
              setDueDateForm((prev) => ({ ...prev, dueTime: e.target.value }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDueDateDialogOpen(false);
              setDueDateEditAssignment(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditDueDateSubmit}
            disabled={!dueDateForm.dueDate}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* Classwide extension */}
      <ClasswideExtensionDialog
        open={classwideOpen}
        assignment={extensionAssignment}
        form={classwideForm}
        onChange={(patch) => setClasswideForm((prev) => ({ ...prev, ...patch }))}
        onClose={() => {
          if (classwideSaving) return;
          setClasswideOpen(false);
          setClasswideError("");
        }}
        onSubmit={handleClasswideSubmit}
        saving={classwideSaving}
        error={classwideError}
      />

      {/* Extension list */}
      <AssignmentExtensionsDialog
        open={extensionsListOpen}
        assignment={extensionAssignment}
        loadExtensions={loadAssignmentExtensions}
        onClose={() => setExtensionsListOpen(false)}
        onClasswide={() => {
          setExtensionsListOpen(false);
          if (extensionAssignment) handleOpenClasswideExtension(extensionAssignment);
        }}
      />
    </Box>
  );
}
