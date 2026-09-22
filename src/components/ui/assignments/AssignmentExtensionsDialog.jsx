import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from "@mui/material";
import AssignmentExtensionsTable from "./AssignmentExtensionsTable.jsx";

export default function AssignmentExtensionsDialog({
  open,
  assignment,
  loadExtensions,
  onClose,
  onClasswide,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadRef = useRef(loadExtensions);
  loadRef.current = loadExtensions;

  useEffect(() => {
    if (!open || !assignment?.id) return undefined;
    const load = loadRef.current;
    if (typeof load !== "function") {
      setRows([]);
      setError("Extensions are not available.");
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
          setError(err?.message || "Failed to load extensions.");
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
      <DialogTitle>Assignment extensions</DialogTitle>
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
        <AssignmentExtensionsTable rows={rows} />
      </DialogContent>
      <DialogActions>
        {onClasswide && (
          <Box sx={{ mr: "auto" }}>
            <Button onClick={onClasswide} disabled={loading}>
              Classwide extension
            </Button>
          </Box>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
