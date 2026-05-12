import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
import { Archive, AlertTriangle } from "lucide-react";

export default function ArchiveCourseSection({ course, onArchive }) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const isArchived = course.status === "past";

  const handleArchiveClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmArchive = () => {
    onArchive(course.id);
    setConfirmDialogOpen(false);
  };

  const handleUnarchive = () => {
    onArchive(course.id, false); // Unarchive
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body1" sx={{ flex: 1 }}>
            {isArchived ? (
              <>
                This course is currently <strong>archived</strong>. Students
                cannot access assignments or submit work.
              </>
            ) : (
              <>
                Archive this course to mark it as completed and prevent student
                submissions.
              </>
            )}
          </Typography>
          <Chip
            label={isArchived ? "Archived" : "Active"}
            color={isArchived ? "default" : "success"}
            size="small"
          />
        </Box>

        {isArchived ? (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Archive size={18} />}
            onClick={handleUnarchive}
            sx={{ alignSelf: "flex-start" }}
          >
            Unarchive Course
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Archive size={18} />}
            onClick={handleArchiveClick}
            sx={{ alignSelf: "flex-start" }}
          >
            Archive Course
          </Button>
        )}
      </Stack>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AlertTriangle size={24} color="#ed6c02" />
            <Typography variant="h6" component="div" fontWeight={600}>
              Archive Course?
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">
              Archiving this course will prevent students from accessing
              assignments and submitting work.
            </Alert>

            <Typography variant="body1">
              Are you sure you want to archive <strong>{course.name}</strong> (
              {course.code})?
            </Typography>

            <Box
              sx={{
                p: 2,
                backgroundColor: "action.hover",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                <strong>What happens when you archive:</strong>
              </Typography>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Course moves to "Archived Courses" section
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Students can view grades but cannot submit assignments
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    You can unarchive the course at any time
                  </Typography>
                </li>
              </ul>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmArchive}
            variant="contained"
            color="warning"
            startIcon={<Archive size={18} />}
          >
            Archive Course
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
