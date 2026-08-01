import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CardContent,
  Stack,
  TextField,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Save } from "lucide-react";
import ThemedCard from "../../../components/ui/ThemedCard.jsx";
import {
  DEFAULT_LOGIC_SYSTEM,
  getLogicSystemOptions,
  normalizeLogicSystem,
} from "../../../lib/logicSystems.js";

const LOGIC_SYSTEM_OPTIONS = getLogicSystemOptions();

export default function CourseInfoSection({ course, onSave }) {
  const courseLogicSystem = normalizeLogicSystem(
    course?.logicSystem ?? course?.logic_system,
    DEFAULT_LOGIC_SYSTEM
  );
  const [courseName, setCourseName] = useState(course?.name || "");
  const [courseCode, setCourseCode] = useState(course?.code || "");
  const [semester, setSemester] = useState(course?.semester || "");
  const [logicSystem, setLogicSystem] = useState(courseLogicSystem);
  const [courseColor, setCourseColor] = useState(course?.color || "#536DFE");

  useEffect(() => {
    setCourseName(course?.name || "");
    setCourseCode(course?.code || "");
    setSemester(course?.semester || "");
    setLogicSystem(courseLogicSystem);
    setCourseColor(course?.color || "#536DFE");
  }, [course, courseLogicSystem]);

  const handleSave = () => {
    onSave({
      name: courseName,
      code: courseCode,
      semester: semester,
      logicSystem,
      color: courseColor,
    });
  };

  const hasChanges =
    courseName !== course?.name ||
    courseCode !== course?.code ||
    semester !== course?.semester ||
    logicSystem !== courseLogicSystem ||
    courseColor !== course?.color;

  return (
    <ThemedCard sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" component="h2" fontWeight={600} mb={2}>
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

          <FormControl fullWidth>
            <InputLabel>Logic System</InputLabel>
            <Select
              value={logicSystem}
              onChange={(e) => setLogicSystem(e.target.value)}
              label="Logic System"
            >
              {LOGIC_SYSTEM_OPTIONS.map((system) => (
                <MenuItem key={system.id} value={system.id}>
                  {system.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
                placeholder="#536DFE"
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
          onClick={handleSave}
          size="small"
          disabled={!hasChanges}
        >
          Save Course Info
        </Button>
      </Box>
    </ThemedCard>
  );
}
