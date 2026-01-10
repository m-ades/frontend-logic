import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useCoursesState } from "../../context/CoursesContext";
import GradebookFilters from "../../components/ui/gradebook/GradebookFilters";
import GradebookTable from "../../components/ui/gradebook/GradebookTable";
import { filterStudents, sortStudents } from "../../utils/GradebookUtils";

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

  // Apply filters and sorting
  const filteredStudents = filterStudents(
    students,
    searchTerm,
    selectedAssignment,
    gradeFilter
  );

  const sortedStudents = sortStudents(
    filteredStudents,
    sortColumn,
    sortDirection
  );

  // Handle sort column click
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

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

      <GradebookFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedAssignment={selectedAssignment}
        setSelectedAssignment={setSelectedAssignment}
        gradeFilter={gradeFilter}
        setGradeFilter={setGradeFilter}
        assignments={assignments}
      />

      <GradebookTable
        students={sortedStudents}
        assignments={assignments}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        handleSort={handleSort}
      />

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
