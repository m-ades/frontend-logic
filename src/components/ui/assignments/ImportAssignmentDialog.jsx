import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppRuntime } from "../../../hooks/useAppRuntime.js";
import { hasInstructorAccess } from "../../../utils/auth.js";

export default function ImportAssignmentDialog({ open, onClose, kind = "assignment" }) {
  const { courseState, courseActions, user } = useAppRuntime();
  const { activeCourseId, courses } = courseState;
  const isPractice = kind === "practice";
  const label = isPractice ? "Practice Assignment" : "Assignment";
  const activeCourse = courses.find((course) => course.id === activeCourseId);
  // mirrors the server rule so the list only offers classes a copy can come from
  const sourceClasses = courses.filter((course) => (
    course.id !== activeCourseId
    && course.logicSystem === activeCourse?.logicSystem
    && hasInstructorAccess(user, course.role)
  ));
  const [chosenSourceId, setChosenSourceId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const sourceId = chosenSourceId || sourceClasses[0]?.id || "";

  const assignmentsQuery = useQuery({
    queryKey: ["import-source", kind, sourceId],
    queryFn: () => (isPractice ? courseActions.getCoursePractices : courseActions.getCourseAssignments)(sourceId),
    enabled: open && Boolean(sourceId),
    staleTime: 0,
    retry: false,
  });
  const importMutation = useMutation({
    mutationFn: (id) => (isPractice ? courseActions.importPractice : courseActions.importAssignment)(activeCourseId, id),
    onSuccess: onClose,
  });
  const assignments = assignmentsQuery.data ?? [];
  const error = assignmentsQuery.error || importMutation.error;

  // runs after the fade out so the closing dialog doesn't blank
  const reset = () => {
    setChosenSourceId("");
    setAssignmentId("");
    importMutation.reset();
  };

  return (
    <Dialog
      open={open}
      onClose={importMutation.isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ transition: { onExited: reset } }}
    >
      <DialogTitle>Import {label}</DialogTitle>
      {(assignmentsQuery.isFetching || importMutation.isPending) && <LinearProgress />}
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Copies the {label.toLowerCase()} and all of its questions from another class you teach.
            The copy starts locked so you can adjust it before students see it.
          </Typography>
          {error && <Alert severity="error">{error.message}</Alert>}
          {sourceClasses.length === 0 ? (
            <Alert severity="info">None of your other classes use the same logic system as this one.</Alert>
          ) : (
            <>
              <TextField
                select
                label="Class"
                value={sourceId}
                onChange={(event) => {
                  setChosenSourceId(event.target.value);
                  setAssignmentId("");
                }}
                fullWidth
              >
                {sourceClasses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>{course.code} · {course.semester}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={label}
                value={assignmentId}
                onChange={(event) => setAssignmentId(event.target.value)}
                disabled={assignments.length === 0}
                helperText={assignmentsQuery.isSuccess && assignments.length === 0
                  ? `This class has no ${label.toLowerCase()}s`
                  : undefined}
                fullWidth
              >
                {assignments.map((assignment) => (
                  <MenuItem key={assignment.id} value={assignment.id}>{assignment.name}</MenuItem>
                ))}
              </TextField>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importMutation.isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => importMutation.mutate(assignmentId)}
          disabled={!assignmentId || importMutation.isPending}
        >
          {importMutation.isPending ? "Importing..." : "Import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
