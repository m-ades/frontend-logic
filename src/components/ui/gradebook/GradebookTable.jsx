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
  Tooltip,
  alpha,
} from "@mui/material";
import {
  getLetterGrade,
  getGradeColorVariant,
  isPassingGrade,
  getDefaultGradingScale,
} from "../../../utils/gradingUtils";
import { getStudentAverage } from "../../../utils/GradebookUtils";
import StudentProfileModal from "../StudentProfileModal";
import StudentSubmissionDialog from "./StudentSubmissionDialog.jsx";
import { useAppRuntime } from "../../../hooks/useAppRuntime.js";

function splitAssignmentTitle(name = "") {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return { title: "Assignment", subtitle: "" };
  }
  const parts = trimmed.split(":");
  if (parts.length === 1) {
    return { title: trimmed, subtitle: "" };
  }
  const title = parts[0].trim();
  const subtitle = parts.slice(1).join(":").trim();
  return { title: title || trimmed, subtitle };
}

export default function GradebookTable({
  students,
  assignments,
  sortColumn,
  sortDirection,
  handleSort,
}) {
  const { courseState, user } = useAppRuntime();
  const { courses, activeCourseId } = courseState;
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const gradingScale = activeCourse?.gradingScale || getDefaultGradingScale();
  const isInstructor = activeCourse?.role === "instructor" || Boolean(user?.is_system_admin);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

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
            overflowX: "auto",
            borderRadius: 3,
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    backgroundColor: "background.paper",
                    width: { xs: 110, sm: 130 },
                    minWidth: { xs: 110, sm: 130 },
                    maxWidth: { xs: 110, sm: 130 },
                    overflowWrap: "anywhere",
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    borderRight: "2px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                    transition: "background-color 0.1s",
                    px: 1,
                    py: 0.75,
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
                    width: 90,
                    minWidth: 90,
                    position: "sticky",
                    left: { xs: "auto", sm: 130 },
                    zIndex: 3,
                    borderRight: "2px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                    transition: "background-color 0.1s",
                    px: 1,
                    py: 0.75,
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
                {assignments.map((assignment) => {
                  const { title, subtitle } = splitAssignmentTitle(
                    assignment.name
                  );
                  const tooltipTitle = subtitle || assignment.name || "";

                  return (
                    <TableCell
                      key={assignment.id}
                      align="center"
                      sx={{
                        fontWeight: 600,
                        backgroundColor: "background.paper",
                        width: 58,
                        minWidth: 58,
                        whiteSpace: "nowrap",
                        px: 0.5,
                        py: 0.75,
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
                        {tooltipTitle ? (
                          <Tooltip title={tooltipTitle} arrow>
                            <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                              {title}
                            </Box>
                          </Tooltip>
                        ) : (
                          title
                        )}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((student) => {
                const average = getStudentAverage(student);
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
                        width: { xs: 110, sm: 130 },
                        minWidth: { xs: 110, sm: 130 },
                        maxWidth: { xs: 110, sm: 130 },
                        overflowWrap: "anywhere",
                        px: 1,
                        py: 0.75,
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
                        position: { xs: "static", sm: "sticky" },
                        left: { xs: "auto", sm: 130 },
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
                        width: 90,
                        minWidth: 90,
                        px: 1,
                        py: 0.75,
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
                          {average === null ? "—" : `${average}%`}
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
                      const hasGrade = grade !== undefined && grade !== null;
                      const canViewSubmission = isInstructor && hasGrade;
                      const isPassing =
                        hasGrade
                          ? isPassingGrade(grade, gradingScale)
                          : null;

                      return (
                        <TableCell
                          key={assignment.id}
                          align="center"
                          sx={{
                            width: 58,
                            minWidth: 58,
                            whiteSpace: "nowrap",
                            px: 0.5,
                            py: 0.75,
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
                            component={canViewSubmission ? "button" : "span"}
                            type={canViewSubmission ? "button" : undefined}
                            aria-label={canViewSubmission ? `View ${student.username}'s submission for ${assignment.name}: ${grade}%` : undefined}
                            onClick={canViewSubmission ? () => setSelectedSubmission({ student, assignment }) : undefined}
                            variant="body2"
                            sx={{
                              border: 0,
                              p: 0,
                              background: "none",
                              cursor: canViewSubmission ? "pointer" : undefined,
                              "&:hover": canViewSubmission ? { textDecoration: "underline" } : undefined,
                              "&:focus-visible": {
                                outline: "2px solid",
                                outlineColor: "primary.main",
                                outlineOffset: 2,
                              },
                              color:
                                hasGrade
                                  ? isPassing
                                    ? "text.primary"
                                    : "error.main"
                                  : "text.secondary",
                              fontWeight: hasGrade ? 600 : 400,
                            }}
                          >
                            {hasGrade ? `${grade}%` : "—"}
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
        canEditAccommodations={isInstructor}
      />
      {isInstructor && selectedSubmission && (
        <StudentSubmissionDialog
          key={`${selectedSubmission.assignment.id}-${selectedSubmission.student.id}`}
          student={selectedSubmission.student}
          assignment={selectedSubmission.assignment}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </>
  );
}
