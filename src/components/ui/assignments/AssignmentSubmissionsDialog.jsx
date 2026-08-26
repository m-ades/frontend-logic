import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  LinearProgress,
  Typography,
} from "@mui/material";
import AssignmentSubmissionsTable from "./AssignmentSubmissionsTable.jsx";

export default function AssignmentSubmissionsDialog({
  open,
  assignment,
  loadSubmissions,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadRef = useRef(loadSubmissions);
  loadRef.current = loadSubmissions;

  useEffect(() => {
    if (!open || !assignment?.id) return undefined;
    const load = loadRef.current;
    if (typeof load !== "function") {
      setRows([]);
      setError("Submissions are not available.");
      return undefined;
    }

    let cancelled = false;
    setError("");
    setLoading(true);
    load(assignment.id)
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([]);
          setError(err?.message || "Failed to load submissions.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, assignment?.id]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Assignment submissions</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        {assignment?.name && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {assignment.name}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!loading && !error && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Latest attempt is shown first. Expand a row for question details, then expand again for prior attempts.
          </Typography>
        )}
        {!loading && <AssignmentSubmissionsTable rows={rows} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
