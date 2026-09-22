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
  loadQuestions,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsFailed, setQuestionsFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadRef = useRef(loadSubmissions);
  loadRef.current = loadSubmissions;
  const loadQuestionsRef = useRef(loadQuestions);
  loadQuestionsRef.current = loadQuestions;

  useEffect(() => {
    if (!open || !assignment?.id) return undefined;
    const load = loadRef.current;
    const loadQ = loadQuestionsRef.current;
    if (typeof load !== "function") {
      setRows([]);
      setError("Submissions are not available.");
      return undefined;
    }

    let cancelled = false;
    setError("");
    setLoading(true);
    setQuestionsFailed(false);
    // numbering only; a failure here shouldn't sink the whole dialog
    let questionsFailedLocally = false;
    const questionsPromise = typeof loadQ === "function"
      ? loadQ(assignment.id).catch(() => { questionsFailedLocally = true; return []; })
      : Promise.resolve([]);
    Promise.all([load(assignment.id), questionsPromise])
      .then(([submissionRows, questionRows]) => {
        if (cancelled) return;
        setRows(Array.isArray(submissionRows) ? submissionRows : []);
        setQuestions(Array.isArray(questionRows) ? questionRows : []);
        setQuestionsFailed(questionsFailedLocally);
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([]);
          setQuestions([]);
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
        {!loading && !error && questionsFailed && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Couldn't load the assignment's question order, so problem numbers below may not match the worksheet.
          </Alert>
        )}
        {!loading && !error && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Latest attempt is shown first. Expand a row for question details, then expand again for prior attempts.
          </Typography>
        )}
        {!loading && <AssignmentSubmissionsTable rows={rows} questions={questions} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
