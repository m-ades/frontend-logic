import { Paper, Stack, TextField, MenuItem } from "@mui/material";

export default function GradebookFilters({
  selectedAssignment,
  setSelectedAssignment,
  gradeFilter,
  setGradeFilter,
  assignments,
}) {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3, maxWidth: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="Assignment"
          value={selectedAssignment}
          onChange={(e) => setSelectedAssignment(e.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">All Assignments</MenuItem>
          {assignments.map((assignment) => (
            <MenuItem key={assignment.id} value={assignment.id}>
              {assignment.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Grade Filter"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All Grades</MenuItem>
          <MenuItem value="a">A (90-100)</MenuItem>
          <MenuItem value="b">B (80-89)</MenuItem>
          <MenuItem value="c">C (70-79)</MenuItem>
          <MenuItem value="d">D (60-69)</MenuItem>
          <MenuItem value="f">F (0-59)</MenuItem>
        </TextField>
      </Stack>
    </Paper>
  );
}
