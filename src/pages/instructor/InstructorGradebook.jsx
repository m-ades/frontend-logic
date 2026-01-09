import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TextField,
  MenuItem,
  Stack,
  InputAdornment,
  TableSortLabel,
} from "@mui/material";
import { Search } from "lucide-react";
import { useCoursesState } from "../../context/CoursesContext";

// Calculate average grade from grades object
function calculateAverage(grades) {
  const values = Object.values(grades);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// Get letter grade from numeric grade
function getLetterGrade(grade) {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}

export default function InstructorGradebook() {
  const { courses, activeCourseId, assignmentsByCourse, gradebookByCourse } =
    useCoursesState();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");

  // Sort states
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  const course = courses.find((c) => c.id === activeCourseId);
  const assignments = assignmentsByCourse[activeCourseId] || [];
  const students = gradebookByCourse[activeCourseId] || [];

  if (!course) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} mb={3}>
          Gradebook
        </Typography>
        <Typography color="text.secondary">No course selected</Typography>
      </Box>
    );
  }

  // Apply filters
  const filteredStudents = students.filter((student) => {
    // Search filter
    if (
      searchTerm &&
      !student.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Assignment-specific grade filter
    if (selectedAssignment !== "all") {
      const grade = student.grades[selectedAssignment];
      if (grade === undefined) return false;

      if (gradeFilter === "a" && grade < 90) return false;
      if (gradeFilter === "b" && (grade < 80 || grade >= 90)) return false;
      if (gradeFilter === "c" && (grade < 70 || grade >= 80)) return false;
      if (gradeFilter === "d" && (grade < 60 || grade >= 70)) return false;
      if (gradeFilter === "f" && grade >= 60) return false;
    } else if (gradeFilter !== "all") {
      // Overall average filter
      const average = calculateAverage(student.grades);
      if (gradeFilter === "a" && average < 90) return false;
      if (gradeFilter === "b" && (average < 80 || average >= 90)) return false;
      if (gradeFilter === "c" && (average < 70 || average >= 80)) return false;
      if (gradeFilter === "d" && (average < 60 || average >= 70)) return false;
      if (gradeFilter === "f" && average >= 60) return false;
    }

    return true;
  });

  // Handle sort column click
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let aValue, bValue;

    if (sortColumn === "name") {
      aValue = a.name.toLowerCase();
      bValue = b.name.toLowerCase();
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (sortColumn === "average") {
      aValue = calculateAverage(a.grades);
      bValue = calculateAverage(b.grades);
    } else {
      aValue = a.grades[sortColumn] ?? -1;
      bValue = b.grades[sortColumn] ?? -1;
    }

    if (sortDirection === "asc") {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "calc(100vw - 140px)",
        overflow: "hidden",
      }}
    >
      <Typography variant="h4" fontWeight={600} mb={1}>
        Gradebook
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        {course.name}
      </Typography>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, maxWidth: "100%" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />

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

      {/* Gradebook Table */}
      <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
        <Box
          sx={{
            width: "100%",
            height: "calc(100vh - 320px)",
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    backgroundColor: "background.paper",
                    width: 180,
                    minWidth: 180,
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    borderRight: "2px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSort("name")}
                >
                  <TableSortLabel
                    active={sortColumn === "name"}
                    direction={sortColumn === "name" ? sortDirection : "asc"}
                  >
                    Student
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 600,
                    backgroundColor: "background.paper",
                    width: 120,
                    minWidth: 120,
                    position: "sticky",
                    left: 180,
                    zIndex: 3,
                    borderRight: "2px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSort("average")}
                >
                  <TableSortLabel
                    active={sortColumn === "average"}
                    direction={sortColumn === "average" ? sortDirection : "asc"}
                  >
                    Average
                  </TableSortLabel>
                </TableCell>
                {assignments.map((assignment) => (
                  <TableCell
                    key={assignment.id}
                    align="center"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "background.paper",
                      width: 110,
                      minWidth: 110,
                      cursor: "pointer",
                    }}
                    onClick={() => handleSort(assignment.id)}
                  >
                    <TableSortLabel
                      active={sortColumn === assignment.id}
                      direction={
                        sortColumn === assignment.id ? sortDirection : "asc"
                      }
                    >
                      {assignment.name}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedStudents.map((student) => {
                const average = calculateAverage(student.grades);
                const letterGrade = getLetterGrade(average);

                return (
                  <TableRow key={student.id} hover>
                    <TableCell
                      sx={{
                        fontWeight: 500,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "background.paper",
                        zIndex: 1,
                        borderRight: "2px solid",
                        borderColor: "divider",
                      }}
                    >
                      {student.name}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        position: "sticky",
                        left: 180,
                        backgroundColor: "background.paper",
                        zIndex: 1,
                        borderRight: "2px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {average}%
                        </Typography>
                        <Chip
                          label={letterGrade}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </TableCell>

                    {assignments.map((assignment) => {
                      const grade = student.grades[assignment.id];

                      return (
                        <TableCell key={assignment.id} align="center">
                          <Typography variant="body2">
                            {grade !== undefined ? `${grade}%` : "—"}
                          </Typography>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Empty states */}
      {students.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="text.secondary">
            No students enrolled in this course
          </Typography>
        </Box>
      )}

      {students.length > 0 && filteredStudents.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="text.secondary">
            No students match the current filters
          </Typography>
        </Box>
      )}

      {/* Results count */}
      {sortedStudents.length > 0 && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Showing {sortedStudents.length} of {students.length} students
          </Typography>
        </Box>
      )}
    </Box>
  );
}
