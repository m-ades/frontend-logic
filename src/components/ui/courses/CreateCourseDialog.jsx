import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import { useState } from "react";

const SEMESTER_TERMS = ["Spring", "Summer", "Fall", "Winter"];

const COURSE_COLORS = [
  { name: "Blue", value: "#1976d2" },
  { name: "Purple", value: "#9c27b0" },
  { name: "Green", value: "#2e7d32" },
  { name: "Orange", value: "#ed6c02" },
  { name: "Red", value: "#d32f2f" },
  { name: "Teal", value: "#0097a7" },
  { name: "Pink", value: "#c2185b" },
  { name: "Indigo", value: "#3f51b5" },
];

const DEFAULT_YEAR = new Date().getFullYear();

const DEFAULT_LATE_POLICY = {
  enabled: true,
  maxDaysLate: 7,
  penalty: 20,
};

const DEFAULT_GRADING_SCALE = [
  { letter: "A", minPercent: 90, maxPercent: 100, color: "#10b981" },
  { letter: "B", minPercent: 80, maxPercent: 89, color: "#6366f1" },
  { letter: "C", minPercent: 70, maxPercent: 79, color: "#f59e0b" },
  { letter: "D", minPercent: 60, maxPercent: 69, color: "#f97316" },
  { letter: "F", minPercent: 0, maxPercent: 59, color: "#ef4444" },
];

export default function CreateCourseDialog({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    term: "Spring",
    year: DEFAULT_YEAR.toString(),
    color: "#1976d2",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Course name is required";
    }

    if (!formData.code.trim()) {
      newErrors.code = "Course code is required";
    } else if (!/^[A-Z0-9-]+$/i.test(formData.code)) {
      newErrors.code =
        "Course code should only contain letters, numbers, and hyphens";
    }

    if (!formData.year.trim()) {
      newErrors.year = "Year is required";
    } else if (!/^\d{4}$/.test(formData.year)) {
      newErrors.year = "Year must be a 4-digit number";
    } else {
      const yearNum = parseInt(formData.year);
      if (yearNum < 2000 || yearNum > 2100) {
        newErrors.year = "Year must be between 2000 and 2100";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const newCourse = {
      id: `course_${Date.now()}`,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      semester: `${formData.term} ${formData.year}`,
      status: "current",
      color: formData.color,
      studentCount: 0,
      latePolicy: DEFAULT_LATE_POLICY,
      gradingScale: DEFAULT_GRADING_SCALE,
      createdAt: new Date().toISOString(),
    };

    onSubmit(newCourse);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: "",
      code: "",
      term: "Spring",
      year: DEFAULT_YEAR.toString(),
      color: "#1976d2",
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Create New Course
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Course Name"
            placeholder="e.g., Introduction to Computer Science"
            value={formData.name}
            onChange={handleChange("name")}
            error={!!errors.name}
            helperText={errors.name || "Full name of the course"}
            fullWidth
            autoFocus
          />

          <TextField
            label="Course Code"
            placeholder="e.g., CS101-01"
            value={formData.code}
            onChange={handleChange("code")}
            error={!!errors.code}
            helperText={
              errors.code || "Unique identifier for this course section"
            }
            fullWidth
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Term</InputLabel>
              <Select
                value={formData.term}
                onChange={handleChange("term")}
                label="Term"
              >
                {SEMESTER_TERMS.map((term) => (
                  <MenuItem key={term} value={term}>
                    {term}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Year"
              placeholder="e.g., 2025"
              value={formData.year}
              onChange={handleChange("year")}
              error={!!errors.year}
              helperText={errors.year}
              sx={{ width: 140 }}
            />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Course Color
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {COURSE_COLORS.map((color) => (
                <Box
                  key={color.value}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, color: color.value }))
                  }
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: color.value,
                    cursor: "pointer",
                    border: 3,
                    borderColor:
                      formData.color === color.value
                        ? "primary.main"
                        : "transparent",
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "scale(1.1)",
                      boxShadow: 2,
                    },
                  }}
                  title={color.name}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disableElevation>
          Create Course
        </Button>
      </DialogActions>
    </Dialog>
  );
}
