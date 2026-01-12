import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Paper,
  IconButton,
  Divider,
} from "@mui/material";
import { Upload, FileText, CheckCircle, XCircle, X } from "lucide-react";

export default function ImportRosterDialog({ open, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setErrors(["Please select a CSV file"]);
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          setErrors([
            "CSV file must contain a header row and at least one student",
          ]);
          setParseResult(null);
          return;
        }

        // Parse header
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

        // Validate required columns
        const requiredColumns = ["username", "password"];
        const missingColumns = requiredColumns.filter(
          (col) => !headers.includes(col)
        );

        if (missingColumns.length > 0) {
          setErrors([
            `Missing required columns: ${missingColumns.join(
              ", "
            )}. Required: username, password`,
          ]);
          setParseResult(null);
          return;
        }

        // Parse data rows
        const students = [];
        const rowErrors = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          const student = {};

          headers.forEach((header, index) => {
            student[header] = values[index] || "";
          });

          // Validate student data
          const studentErrors = [];
          if (!student.username) {
            studentErrors.push(`Row ${i + 1}: Missing username`);
          }
          if (!student.password) {
            studentErrors.push(`Row ${i + 1}: Missing password`);
          } else if (student.password.length < 6) {
            studentErrors.push(
              `Row ${i + 1}: Password must be at least 6 characters`
            );
          }

          if (studentErrors.length > 0) {
            rowErrors.push(...studentErrors);
          } else {
            students.push({
              username: student.username,
              password: student.password,
              valid: true,
            });
          }
        }

        if (rowErrors.length > 0) {
          setErrors(rowErrors);
        } else {
          setErrors([]);
        }

        setParseResult({
          total: students.length,
          valid: students.filter((s) => s.valid).length,
          students: students,
        });
      } catch (error) {
        setErrors(["Failed to parse CSV file. Please check the format."]);
        setParseResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parseResult && parseResult.valid > 0) {
      const validStudents = parseResult.students.filter((s) => s.valid);
      onImport(validStudents);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    setErrors([]);
    onClose();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const event = { target: { files: [droppedFile] } };
      handleFileChange(event);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Upload size={24} />
            <Typography variant="h6" fontWeight={600}>
              Import Roster from CSV
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600} mb={1}>
              CSV Format Requirements:
            </Typography>
            <Typography variant="body2" component="div">
              • First row must be headers: <strong>username,password</strong>
              <br />
              • Each subsequent row represents one student
              <br />
              • Passwords must be at least 6 characters
            </Typography>
          </Alert>

          {/* File Upload Area */}
          <Box
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            sx={{
              border: "2px dashed",
              borderColor: file ? "primary.main" : "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: file ? "primary.light" : "action.hover",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "primary.light",
              },
            }}
            onClick={() => document.getElementById("csv-file-input").click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {file ? (
              <Box>
                <FileText
                  size={48}
                  color="#1976d2"
                  style={{ marginBottom: 8 }}
                />
                <Typography variant="body1" fontWeight={600}>
                  {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click or drop a new file to replace
                </Typography>
              </Box>
            ) : (
              <Box>
                <Upload size={48} color="#9e9e9e" style={{ marginBottom: 8 }} />
                <Typography variant="body1" fontWeight={600} mb={0.5}>
                  Drop CSV file here or click to browse
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Maximum file size: 5MB
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Found {errors.length} error{errors.length > 1 ? "s" : ""}:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.slice(0, 5).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
            {errors.length > 5 && (
              <Typography variant="caption">
                ...and {errors.length - 5} more
              </Typography>
            )}
          </Alert>
        )}

        {/* Parse Results */}
        {parseResult && (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Chip
                icon={<CheckCircle size={16} />}
                label={`${parseResult.valid} Valid`}
                color="success"
              />
              {parseResult.total - parseResult.valid > 0 && (
                <Chip
                  icon={<XCircle size={16} />}
                  label={`${parseResult.total - parseResult.valid} Invalid`}
                  color="error"
                />
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Preview ({parseResult.students.length} students):
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                maxHeight: 300,
                overflow: "auto",
                borderRadius: 2,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Password</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parseResult.students.map((student, index) => (
                    <TableRow key={index}>
                      <TableCell>{student.username}</TableCell>
                      <TableCell>
                        {"•".repeat(student.password.length)}
                      </TableCell>
                      <TableCell align="center">
                        {student.valid ? (
                          <CheckCircle size={16} color="#22c55e" />
                        ) : (
                          <XCircle size={16} color="#ef4444" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!parseResult || parseResult.valid === 0}
          startIcon={<Upload size={18} />}
        >
          Import {parseResult?.valid || 0} Students
        </Button>
      </DialogActions>
    </Dialog>
  );
}
