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
  TableSortLabel,
  Chip,
  alpha,
} from "@mui/material";
import { useCoursesState } from "../../../context/CoursesContext";
import {
  getLetterGrade,
  getGradeColorVariant,
  isPassingGrade,
  getDefaultGradingScale,
} from "../../../utils/gradingUtils";
import StudentProfileModal from "../StudentProfileModal";

// Helper function to calculate average
function calculateAverage(grades) {
  const validGrades = Object.values(grades).filter(
    (g) => g !== undefined && g !== null && !isNaN(g)
  );
  if (validGrades.length === 0) return 0;
  return Math.round(
    validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
  );
}

export default function GradebookTable({
  students,
  assignments,
  sortColumn,
  sortDirection,
  handleSort,
}) {
  const { courses, activeCourseId } = useCoursesState();
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Track hovered column
  const [hoveredColumn, setHoveredColumn] = useState(null);
  // Track hovered row
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleStudentNameClick = (student, event) => {
    event.stopPropagation();
    setSelectedStudent(student);
    setProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setProfileModalOpen(false);
    setSelectedStudent(null);
  };

  return (
    <>
      <Paper elevation={1} sx={{ width: "100%", overflow: "hidden" }}>
        <Box
          sx={{
            width: "100%",
            height: "calc(100vh - 320px)",
            overflowX: "auto",
            overflowY: "auto",
            borderRadius: 3,
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
                    transition: "background-color 0.1s",
                  }}
                  onClick={() => handleSort("username")}
                  onMouseEnter={() => setHoveredColumn("username")}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <TableSortLabel
                    active={sortColumn === "username"}
                    direction={
                      sortColumn === "username" ? sortDirection : "asc"
                    }
                  >
                    Student
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 600,
                    backgroundColor: "background.paper",
                    width: 140,
                    minWidth: 140,
                    position: "sticky",
                    left: 180,
                    zIndex: 3,
                    borderRight: "2px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                    transition: "background-color 0.1s",
                  }}
                  onClick={() => handleSort("average")}
                  onMouseEnter={() => setHoveredColumn("average")}
                  onMouseLeave={() => setHoveredColumn(null)}
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
                      transition: "background-color 0.1s",
                    }}
                    onClick={() => handleSort(assignment.id)}
                    onMouseEnter={() => setHoveredColumn(assignment.id)}
                    onMouseLeave={() => setHoveredColumn(null)}
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
              {students.map((student) => {
                const average = calculateAverage(student.grades);
                const letterGrade = getLetterGrade(average, gradingScale);
                const gradeColorVariant = getGradeColorVariant(
                  average,
                  gradingScale
                );
                const isRowHovered = hoveredRow === student.id;

                return (
                  <TableRow
                    key={student.id}
                    onMouseEnter={() => setHoveredRow(student.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 500,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "background.paper",
                        backgroundImage: isRowHovered
                          ? (theme) =>
                              `linear-gradient(${alpha(
                                theme.palette.primary.main,
                                0.08
                              )}, ${alpha(theme.palette.primary.main, 0.08)})`
                          : "none",
                        zIndex: 2,
                        borderRight: "2px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        transition: "background-image 0.1s",
                        "&:hover": {
                          color: "primary.main",
                          textDecoration: "underline",
                        },
                      }}
                      onClick={(e) => handleStudentNameClick(student, e)}
                      onMouseEnter={() => setHoveredColumn("username")}
                      onMouseLeave={() => setHoveredColumn(null)}
                    >
                      {student.username}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        position: "sticky",
                        left: 180,
                        backgroundColor: "background.paper",
                        backgroundImage: isRowHovered
                          ? (theme) =>
                              `linear-gradient(${alpha(
                                theme.palette.primary.main,
                                0.08
                              )}, ${alpha(theme.palette.primary.main, 0.08)})`
                          : "none",
                        zIndex: 2,
                        borderRight: "2px solid",
                        borderColor: "divider",
                        transition: "background-image 0.1s",
                      }}
                      onMouseEnter={() => setHoveredColumn("average")}
                      onMouseLeave={() => setHoveredColumn(null)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {average}%
                        </Typography>
                        <Chip
                          label={letterGrade}
                          color={gradeColorVariant}
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
                      const isPassing =
                        grade !== undefined
                          ? isPassingGrade(grade, gradingScale)
                          : null;

                      return (
                        <TableCell
                          key={assignment.id}
                          align="center"
                          sx={{
                            backgroundColor: isRowHovered
                              ? (theme) =>
                                  alpha(theme.palette.primary.main, 0.08)
                              : hoveredColumn === assignment.id
                              ? (theme) =>
                                  alpha(theme.palette.primary.main, 0.08)
                              : "transparent",
                            transition: "background-color 0.1s",
                          }}
                          onMouseEnter={() => setHoveredColumn(assignment.id)}
                          onMouseLeave={() => setHoveredColumn(null)}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                grade !== undefined
                                  ? isPassing
                                    ? "text.primary"
                                    : "error.main"
                                  : "text.secondary",
                              fontWeight: grade !== undefined ? 600 : 400,
                            }}
                          >
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

      {/* Student Profile Modal */}
      <StudentProfileModal
        open={profileModalOpen}
        onClose={handleCloseProfileModal}
        student={selectedStudent}
        assignments={assignments}
      />
    </>
  );
}
