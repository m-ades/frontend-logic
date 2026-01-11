import { useState } from "react";
import {
  Box,
  Typography,
  CardContent,
  Stack,
  TextField,
  Button,
  Divider,
  Alert,
  InputAdornment,
  Switch,
  FormControlLabel,
  IconButton,
  Paper,
} from "@mui/material";
import { Save, Plus, Trash2, AlertCircle } from "lucide-react";
import ThemedCard from "../../components/ui/ThemedCard.jsx";
import {
  useCoursesState,
  useCoursesDispatch,
  saveCourseSettings,
} from "../../context/CoursesContext";

export default function InstructorControls() {
  const { courses, activeCourseId } = useCoursesState();
  const dispatch = useCoursesDispatch();

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  // Local state for form
  const [courseName, setCourseName] = useState(activeCourse?.name || "");
  const [courseCode, setCourseCode] = useState(activeCourse?.code || "");
  const [semester, setSemester] = useState(activeCourse?.semester || "");
  const [courseColor, setCourseColor] = useState(
    activeCourse?.color || "#1976d2"
  );
  const [lateSubmissionsEnabled, setLateSubmissionsEnabled] = useState(
    activeCourse?.latePolicy?.enabled ?? true
  );
  const [lateDaysAllowed, setLateDaysAllowed] = useState(
    activeCourse?.latePolicy?.maxDaysLate ?? 7
  );
  const [latePenalty, setLatePenalty] = useState(
    activeCourse?.latePolicy?.penalty ?? 20
  );

  // Grading scale state
  const [gradingScale, setGradingScale] = useState(
    activeCourse?.gradingScale || [
      { letter: "A", minPercent: 90, maxPercent: 100, color: "#10b981" },
      { letter: "B", minPercent: 80, maxPercent: 89, color: "#6366f1" },
      { letter: "C", minPercent: 70, maxPercent: 79, color: "#f59e0b" },
      { letter: "D", minPercent: 60, maxPercent: 69, color: "#f97316" },
      { letter: "F", minPercent: 0, maxPercent: 59, color: "#ef4444" },
    ]
  );

  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState([]);

  const validateGradingScale = (scale) => {
    const validationErrors = [];

    // Check for gaps or overlaps
    const sortedScale = [...scale].sort((a, b) => b.minPercent - a.minPercent);

    for (let i = 0; i < sortedScale.length - 1; i++) {
      const current = sortedScale[i];
      const next = sortedScale[i + 1];

      if (current.minPercent <= next.maxPercent) {
        validationErrors.push(
          `Grade ranges overlap or have gaps between ${current.letter} and ${next.letter}`
        );
      }
    }

    // Check if ranges cover 0-100
    const hasZero = scale.some((g) => g.minPercent === 0);
    const hasHundred = scale.some((g) => g.maxPercent === 100);

    if (!hasZero) {
      validationErrors.push("Grading scale must include 0%");
    }
    if (!hasHundred) {
      validationErrors.push("Grading scale must include 100%");
    }

    // Check for duplicate letters
    const letters = scale.map((g) => g.letter);
    const duplicates = letters.filter(
      (letter, index) => letters.indexOf(letter) !== index
    );
    if (duplicates.length > 0) {
      validationErrors.push(
        `Duplicate grade letters: ${[...new Set(duplicates)].join(", ")}`
      );
    }

    return validationErrors;
  };

  const handleSaveCourseInfo = async () => {
    const settings = {
      name: courseName,
      code: courseCode,
      semester: semester,
      color: courseColor,
    };

    await saveCourseSettings(dispatch, activeCourseId, settings);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveGradingScale = async () => {
    // Validate grading scale
    const validationErrors = validateGradingScale(gradingScale);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    const settings = {
      gradingScale: gradingScale,
    };

    await saveCourseSettings(dispatch, activeCourseId, settings);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveLatePolicy = async () => {
    const settings = {
      latePolicy: {
        enabled: lateSubmissionsEnabled,
        maxDaysLate: lateDaysAllowed,
        penalty: latePenalty,
      },
    };

    await saveCourseSettings(dispatch, activeCourseId, settings);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSave = async () => {
    // Validate grading scale
    const validationErrors = validateGradingScale(gradingScale);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    const settings = {
      name: courseName,
      code: courseCode,
      semester: semester,
      color: courseColor,
      latePolicy: {
        enabled: lateSubmissionsEnabled,
        maxDaysLate: lateDaysAllowed,
        penalty: latePenalty,
      },
      gradingScale: gradingScale,
    };

    await saveCourseSettings(dispatch, activeCourseId, settings);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleReset = () => {
    setCourseName(activeCourse.name);
    setCourseCode(activeCourse.code);
    setSemester(activeCourse.semester);
    setCourseColor(activeCourse.color);
    setLateSubmissionsEnabled(activeCourse?.latePolicy?.enabled ?? true);
    setLateDaysAllowed(activeCourse?.latePolicy?.maxDaysLate ?? 7);
    setLatePenalty(activeCourse?.latePolicy?.penalty ?? 20);
    setGradingScale(
      activeCourse?.gradingScale || [
        { letter: "A", minPercent: 90, maxPercent: 100, color: "#10b981" },
        { letter: "B", minPercent: 80, maxPercent: 89, color: "#6366f1" },
        { letter: "C", minPercent: 70, maxPercent: 79, color: "#f59e0b" },
        { letter: "D", minPercent: 60, maxPercent: 69, color: "#f97316" },
        { letter: "F", minPercent: 0, maxPercent: 59, color: "#ef4444" },
      ]
    );
    setErrors([]);
  };

  const handleAddGrade = () => {
    setGradingScale([
      ...gradingScale,
      { letter: "", minPercent: 0, maxPercent: 0, color: "#6366f1" },
    ]);
  };

  const handleRemoveGrade = (index) => {
    setGradingScale(gradingScale.filter((_, i) => i !== index));
  };

  const handleGradeChange = (index, field, value) => {
    const newScale = [...gradingScale];
    newScale[index] = { ...newScale[index], [field]: value };
    setGradingScale(newScale);
  };

  if (!activeCourse) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          Controls
        </Typography>
        <Alert severity="info">No course selected</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Course Controls
      </Typography>

      {showSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Course settings saved successfully!
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Course Information */}
      <ThemedCard sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Course Information
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            <TextField
              label="Course Name"
              fullWidth
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              helperText="Update the display name for this course"
            />

            <TextField
              label="Course Code"
              fullWidth
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              helperText="e.g., CS101-02, PHIL275-01"
            />

            <TextField
              label="Semester"
              fullWidth
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              helperText="e.g., Spring 2025, Fall 2024"
            />

            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Course Color
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <input
                  type="color"
                  value={courseColor}
                  onChange={(e) => setCourseColor(e.target.value)}
                  style={{
                    width: 80,
                    height: 40,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                />
                <TextField
                  size="small"
                  value={courseColor}
                  onChange={(e) => setCourseColor(e.target.value)}
                  placeholder="#1976d2"
                  sx={{ maxWidth: 150 }}
                />
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Used for identifying this course in the interface
              </Typography>
            </Box>
          </Stack>
        </CardContent>

        <Box sx={{ px: 3, pb: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={handleSaveCourseInfo}
            size="small"
          >
            Save Course Info
          </Button>
        </Box>
      </ThemedCard>

      {/* Grading Scale */}
      <ThemedCard sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" fontWeight={600} mb={0.5}>
                Grading Scale
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define the letter grades and percentage ranges for this course
              </Typography>
            </Box>

            <Divider />

            <Stack spacing={2}>
              {gradingScale.map((grade, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    backgroundColor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <TextField
                      label="Letter"
                      size="small"
                      value={grade.letter}
                      onChange={(e) =>
                        handleGradeChange(
                          index,
                          "letter",
                          e.target.value.toUpperCase()
                        )
                      }
                      sx={{ width: 80 }}
                      inputProps={{ maxLength: 2 }}
                    />

                    <TextField
                      label="Min %"
                      size="small"
                      type="number"
                      value={grade.minPercent}
                      onChange={(e) =>
                        handleGradeChange(
                          index,
                          "minPercent",
                          Math.max(
                            0,
                            Math.min(100, parseInt(e.target.value) || 0)
                          )
                        )
                      }
                      inputProps={{ min: 0, max: 100 }}
                      sx={{ width: 100 }}
                    />

                    <TextField
                      label="Max %"
                      size="small"
                      type="number"
                      value={grade.maxPercent}
                      onChange={(e) =>
                        handleGradeChange(
                          index,
                          "maxPercent",
                          Math.max(
                            0,
                            Math.min(100, parseInt(e.target.value) || 0)
                          )
                        )
                      }
                      inputProps={{ min: 0, max: 100 }}
                      sx={{ width: 100 }}
                    />

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        mb={0.5}
                      >
                        Color
                      </Typography>
                      <input
                        type="color"
                        value={grade.color}
                        onChange={(e) =>
                          handleGradeChange(index, "color", e.target.value)
                        }
                        style={{
                          width: 60,
                          height: 40,
                          border: "1px solid #ccc",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      />
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    <IconButton
                      onClick={() => handleRemoveGrade(index)}
                      color="error"
                      size="small"
                      disabled={gradingScale.length <= 1}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Stack>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {grade.letter &&
                    grade.minPercent !== "" &&
                    grade.maxPercent !== ""
                      ? `${grade.letter}: ${grade.minPercent}-${grade.maxPercent}%`
                      : "Fill in all fields"}
                  </Typography>
                </Paper>
              ))}

              <Button
                variant="outlined"
                startIcon={<Plus size={18} />}
                onClick={handleAddGrade}
                sx={{ alignSelf: "flex-start" }}
              >
                Add Grade Level
              </Button>
            </Stack>

            <Alert icon={<AlertCircle size={20} />} severity="info">
              Make sure your grading scale covers the full range from 0-100%
              with no gaps or overlaps.
            </Alert>
          </Stack>
        </CardContent>

        <Box sx={{ px: 3, pb: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={handleSaveGradingScale}
            size="small"
          >
            Save Grading Scale
          </Button>
        </Box>
      </ThemedCard>

      {/* Late Submission Policy */}
      <ThemedCard sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" fontWeight={600} mb={0.5}>
                Late Submission Policy
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure how late assignments are handled
              </Typography>
            </Box>

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={lateSubmissionsEnabled}
                  onChange={(e) => setLateSubmissionsEnabled(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Allow Late Submissions
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Students can submit assignments after the due date
                  </Typography>
                </Box>
              }
            />

            {lateSubmissionsEnabled && (
              <Stack spacing={3} sx={{ pl: 2 }}>
                <Alert icon={<AlertCircle size={20} />} severity="info">
                  Late submissions will be accepted with a flat penalty applied
                  to the final grade
                </Alert>

                <TextField
                  label="Maximum Late Days"
                  type="number"
                  value={lateDaysAllowed}
                  onChange={(e) =>
                    setLateDaysAllowed(
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                  }
                  inputProps={{ min: 0, max: 30 }}
                  helperText="Maximum number of days after due date that submissions are accepted"
                  sx={{ maxWidth: 300 }}
                />

                <TextField
                  label="Late Penalty"
                  type="number"
                  value={latePenalty}
                  onChange={(e) =>
                    setLatePenalty(
                      Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                    )
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  }}
                  inputProps={{ min: 0, max: 100 }}
                  helperText="Flat percentage deducted for any late submission (0-100%)"
                  sx={{ maxWidth: 300 }}
                />

                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "action.hover",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    Example Calculation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    A student submits an assignment late (within{" "}
                    {lateDaysAllowed} days) with an earned score of 90%:
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    • Late Penalty: {latePenalty}% deduction (flat rate)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Final Score: 90% - {latePenalty}% ={" "}
                    {Math.max(0, 90 - latePenalty)}%
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, fontStyle: "italic" }}
                  >
                    Note: Submissions beyond {lateDaysAllowed} days late will
                    receive 0%
                  </Typography>
                </Box>
              </Stack>
            )}
          </Stack>
        </CardContent>

        <Box sx={{ px: 3, pb: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={handleSaveLatePolicy}
            size="small"
          >
            Save Late Policy
          </Button>
        </Box>
      </ThemedCard>

      {/* Save All Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button variant="outlined" onClick={handleReset}>
          Reset All
        </Button>
        <Button
          variant="contained"
          startIcon={<Save size={18} />}
          onClick={handleSave}
        >
          Save All Changes
        </Button>
      </Box>
    </Box>
  );
}
