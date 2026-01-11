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
  IconButton,
  Paper,
} from "@mui/material";
import { Save, Plus, Trash2, AlertCircle } from "lucide-react";
import ThemedCard from "../../../components/ui/ThemedCard.jsx";

const DEFAULT_GRADING_SCALE = [
  { letter: "A", minPercent: 90, maxPercent: 100, color: "#10b981" },
  { letter: "B", minPercent: 80, maxPercent: 89, color: "#6366f1" },
  { letter: "C", minPercent: 70, maxPercent: 79, color: "#f59e0b" },
  { letter: "D", minPercent: 60, maxPercent: 69, color: "#f97316" },
  { letter: "F", minPercent: 0, maxPercent: 59, color: "#ef4444" },
];

export default function GradingScaleSection({ course, onSave, onError }) {
  const [gradingScale, setGradingScale] = useState(
    course?.gradingScale || DEFAULT_GRADING_SCALE
  );

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

  const handleSave = () => {
    const validationErrors = validateGradingScale(gradingScale);

    if (validationErrors.length > 0) {
      onError(validationErrors);
      return;
    }

    onError([]);
    onSave({ gradingScale });
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

  const hasChanges =
    JSON.stringify(gradingScale) !==
    JSON.stringify(course?.gradingScale || DEFAULT_GRADING_SCALE);

  return (
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
                    slotProps={{ input: { maxLength: 2 } }}
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
                    slotProps={{ input: { min: 0, max: 100 } }}
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
                    slotProps={{ input: { min: 0, max: 100 } }}
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
            Make sure your grading scale covers the full range from 0-100% with
            no gaps or overlaps.
          </Alert>
        </Stack>
      </CardContent>

      <Box sx={{ px: 3, pb: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          startIcon={<Save size={18} />}
          onClick={handleSave}
          size="small"
          disabled={!hasChanges}
        >
          Save Grading Scale
        </Button>
      </Box>
    </ThemedCard>
  );
}
