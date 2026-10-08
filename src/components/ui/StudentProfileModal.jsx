import { roundNumber } from "../../utils/numberUtils.js";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
} from "@mui/material";
import { X, User } from "lucide-react";
import { getDefaultGradingScale } from "../../utils/gradingUtils";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";
import { getStudentAverage } from "../../utils/GradebookUtils.js";
import ExtensionPopover from "./ExtensionPopover.jsx";
import AccommodationPopover from "./studentProfile/AccommodationPopover.jsx";
import StudentAssignmentTable from "./studentProfile/StudentAssignmentTable.jsx";
import StudentGradeSummary from "./studentProfile/StudentGradeSummary.jsx";
import StudentTrendCard from "./studentProfile/StudentTrendCard.jsx";
import useStudentDeadlinePolicies from "./studentProfile/useStudentDeadlinePolicies.js";
import {
  calculateTrend,
  getAssignmentStatus,
  getGradeMeta,
} from "./studentProfile/studentProfileUtils.js";

export default function StudentProfileModal({
  open,
  onClose,
  student,
  assignments,
  canToggleRole = false,
  canEditAccommodations = false,
  onToggleRole,
}) {
  const { courseState } = useAppRuntime();
  const { courses, activeCourseId } = courseState;
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();
  const { deadlineMap, accommodation, extension } = useStudentDeadlinePolicies({
    open,
    student,
    assignments,
    canEditAccommodations,
  });

  if (!student) return null;

  const normalizedRole =
    String(student.role || "student").toLowerCase() === "ta" ? "ta" : "student";
  const roleLabel = normalizedRole === "ta" ? "TA" : "Student";
  const canChangeRole = canToggleRole && onToggleRole;
  const handleRoleClick = () => {
    if (!canChangeRole) return;
    const newRole = normalizedRole === "ta" ? "student" : "ta";
    const newRoleLabel = newRole === "ta" ? "TA" : "Student";
    const message = `Change ${student.username}'s role to ${newRoleLabel}?`;
    if (window.confirm(message)) {
      onToggleRole(student, newRole);
    }
  };

  const average = getStudentAverage(student);
  const assignmentDetails = assignments.map((assignment) => ({
    ...assignment,
    studentGrade: student.grades[assignment.id],
    status: getAssignmentStatus(assignment, student, deadlineMap),
    submittedLate: Boolean(student.lateSubmissions?.[assignment.id]),
  }));
  const unlockedAssignmentDetails = assignmentDetails.filter(
    (assignment) => assignment.status !== "notReleased"
  );
  const totalAssignments = unlockedAssignmentDetails.length;
  const completedAssignments = unlockedAssignmentDetails.filter(
    (assignment) => assignment.status === "completed"
  ).length;
  const missingAssignments = unlockedAssignmentDetails.filter(
    (assignment) => assignment.status === "missing"
  ).length;
  const completionRate = totalAssignments
    ? roundNumber((completedAssignments / totalAssignments) * 100)
    : 0;
  const gradeValues = Object.values(student.grades).filter(Number.isFinite);
  const highestGrade = gradeValues.length > 0 ? Math.max(...gradeValues) : 0;
  const lowestGrade = gradeValues.length > 0 ? Math.min(...gradeValues) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h5" component="div" fontWeight={700}>
              {student.username}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  ...(canChangeRole
                    ? {
                        cursor: "pointer",
                        "&:hover": { opacity: 0.85 },
                      }
                    : {}),
                }}
                onClick={canChangeRole ? handleRoleClick : undefined}
                role={canChangeRole ? "button" : undefined}
                aria-label={
                  canChangeRole
                    ? `Change role to ${normalizedRole === "ta" ? "Student" : "TA"}`
                    : undefined
                }
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    color: "text.secondary",
                  }}
                  aria-hidden
                >
                  <User size={18} strokeWidth={2} />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textTransform: "capitalize", fontWeight: 500 }}
                >
                  {roleLabel}
                </Typography>
              </Box>
              {canEditAccommodations && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={accommodation.open}
                  disabled={accommodation.loading}
                >
                  Accommodations
                </Button>
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <StudentGradeSummary
          average={average}
          averageGrade={getGradeMeta(average, gradingScale)}
          completedAssignments={completedAssignments}
          completionRate={completionRate}
          gradingScale={gradingScale}
          highestGrade={highestGrade}
          lowestGrade={lowestGrade}
          missingAssignments={missingAssignments}
          totalAssignments={totalAssignments}
        />
        <StudentTrendCard trend={calculateTrend(student.grades, assignments)} />
        <StudentAssignmentTable
          assignmentDetails={assignmentDetails}
          canEditAccommodations={canEditAccommodations}
          deadlineMap={deadlineMap}
          gradingScale={gradingScale}
          onSelectAssignment={extension.select}
        />
      </DialogContent>
      <ExtensionPopover
        anchorEl={extension.anchorEl}
        anchorHorizontal="left"
        assignmentName={extension.assignmentName}
        date={extension.date}
        error={extension.error}
        onClose={extension.close}
        onDateChange={extension.setDate}
        onSave={extension.save}
        onTimeChange={extension.setTime}
        saving={extension.saving}
        time={extension.time}
      />
      <AccommodationPopover accommodation={accommodation} studentName={student?.username} />
    </Dialog>
  );
}
