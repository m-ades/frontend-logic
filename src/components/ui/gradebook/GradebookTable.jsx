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
import {
  calculateAverage,
  getLetterGrade,
} from "../../../utils/gradebookUtils";
import StudentProfileModal from "./StudentProfileModal";
import EditGradeModal from "./EditGradeModal";

export default function GradebookTable({
  students,
  assignments,
  sortColumn,
  sortDirection,
  handleSort,
}) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [editGradeData, setEditGradeData] = useState(null);
  const [editGradeModalOpen, setEditGradeModalOpen] = useState(false);

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

  const handleGradeClick = (student, assignment, grade, event) => {
    event.stopPropagation();
    setEditGradeData({
      student,
      assignment,
      currentGrade: grade,
    });
    setEditGradeModalOpen(true);
  };

  const handleCloseEditGradeModal = () => {
    setEditGradeModalOpen(false);
    setEditGradeData(null);
  };

  const handleSaveGrade = (gradeData) => {
    // TODO: Dispatch action to update grade in context
    console.log("Saving grade:", gradeData);
    // You would call your context dispatch here:
    // dispatch({ type: "UPDATE_STUDENT_GRADE", payload: gradeData });
  };

  const handleDeleteGrade = (deleteData) => {
    // TODO: Dispatch action to delete grade from context
    console.log("Deleting grade:", deleteData);
    // You would call your context dispatch here:
    // dispatch({ type: "DELETE_STUDENT_GRADE", payload: deleteData });
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
                  onClick={() => handleSort("name")}
                  onMouseEnter={() => setHoveredColumn("name")}
                  onMouseLeave={() => setHoveredColumn(null)}
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
                const letterGrade = getLetterGrade(average);
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
                      onMouseEnter={() => setHoveredColumn("name")}
                      onMouseLeave={() => setHoveredColumn(null)}
                    >
                      {student.name}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        position: "sticky",
                        left: 180,
                        backgroundColor: "theme.palette.primary.main",
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
                        <TableCell
                          key={assignment.id}
                          align="center"
                          sx={{
                            cursor: "pointer",
                            backgroundColor: isRowHovered
                              ? (theme) =>
                                  alpha(theme.palette.primary.main, 0.08)
                              : hoveredColumn === assignment.id
                              ? (theme) =>
                                  alpha(theme.palette.primary.main, 0.08)
                              : "transparent",
                            transition: "background-color 0.1s",
                          }}
                          onClick={(e) =>
                            handleGradeClick(student, assignment, grade, e)
                          }
                          onMouseEnter={() => setHoveredColumn(assignment.id)}
                          onMouseLeave={() => setHoveredColumn(null)}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                grade !== undefined
                                  ? grade >= 70
                                    ? ""
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

      {/* Edit Grade Modal */}
      <EditGradeModal
        open={editGradeModalOpen}
        onClose={handleCloseEditGradeModal}
        student={editGradeData?.student}
        assignment={editGradeData?.assignment}
        currentGrade={editGradeData?.currentGrade}
        onSave={handleSaveGrade}
        onDelete={handleDeleteGrade}
      />
    </>
  );
}
