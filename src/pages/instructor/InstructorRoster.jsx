import { useState } from "react";
import { Box, Alert } from "@mui/material";
import {
  useCoursesState,
  useCoursesDispatch,
  addStudentToCourse,
  removeStudentFromCourse,
  bulkCreateStudents,
} from "../../context/CoursesContext";
import AddStudentDialog from "../../components/ui/AddStudentDialog";
import StudentProfileModal from "../../components/ui/StudentProfileModal";
import ImportRosterDialog from "../../components/ui/roster/ImportRosterDialog";
import RosterHeader from "../../components/ui/roster/RosterHeader";
import RosterStatsSection from "../../components/ui/roster/RosterStatsSection";
import RosterSearchBar from "../../components/ui/roster/RosterSearchBar";
import StudentsTable from "../../components/ui/roster/StudentsTable";
import StudentActionsMenu from "../../components/ui/roster/StudentActionsMenu";
import {
  getStudentStats,
  filterStudents,
  calculateClassStats,
  exportRosterCSV,
} from "../../utils/rosterUtils";

export default function InstructorRoster() {
  const { activeCourseId, gradebookByCourse, assignmentsByCourse, courses } =
    useCoursesState();
  const dispatch = useCoursesDispatch();

  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuStudent, setMenuStudent] = useState(null);

  // Get current course data
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const students = gradebookByCourse[activeCourseId] || [];
  const assignments = assignmentsByCourse[activeCourseId] || [];

  // Filter and calculate stats
  const filteredStudents = filterStudents(students, searchQuery);
  const { totalStudents, averageClassGrade, studentsAtRisk } =
    calculateClassStats(students);

  // Handlers
  const handleAddStudent = (studentData) =>
    addStudentToCourse(dispatch, activeCourseId, studentData);

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setProfileModalOpen(true);
  };

  const handleRemoveStudent = async (studentId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this student from the course? This will delete all their grades."
      )
    ) {
      await removeStudentFromCourse(dispatch, activeCourseId, studentId);
    }
    setMenuAnchor(null);
  };

  const handleExportRoster = () => {
    exportRosterCSV(filteredStudents, activeCourse?.code);
  };

  const handleImportRoster = async (studentsToImport) => {
    try {
      const response = await bulkCreateStudents(activeCourseId, studentsToImport);
      const imported = response?.students || [];
      const newStudents = imported.map((student) => ({
        id: student.id,
        username: student.username,
        grades: {},
        lateSubmissions: {},
        submissionDates: {},
        practices: {},
      }));

      const updatedGradebook = [...students, ...newStudents];

      dispatch({
        type: "SET_GRADEBOOK",
        courseId: activeCourseId,
        payload: updatedGradebook,
      });

      dispatch({
        type: "UPDATE_COURSE_SETTINGS",
        courseId: activeCourseId,
        payload: { studentCount: updatedGradebook.length },
      });
    } catch (error) {
      console.error("Failed to import roster:", error);
    } finally {
      setImportDialogOpen(false);
    }
  };

  const handleMenuClick = (event, student) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuStudent(student);
  };

  // Show message if no active course
  if (!activeCourseId) {
    return (
      <Box sx={{ width: "100%", maxWidth: "100%" }}>
        <Alert severity="info">
          Please select a course to view and manage students.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      {/* Header */}
      <RosterHeader
        courseCode={activeCourse?.code}
        onAddStudent={() => setAddDialogOpen(true)}
        onImport={() => setImportDialogOpen(true)}
        onExport={handleExportRoster}
      />

      {/* Stats Cards */}
      <RosterStatsSection
        totalStudents={totalStudents}
        averageGrade={averageClassGrade}
        studentsAtRisk={studentsAtRisk}
        courseCode={activeCourse?.code}
      />

      {/* Search Bar */}
      <RosterSearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Students Table */}
      <StudentsTable
        students={filteredStudents}
        onStudentClick={handleStudentClick}
        onMenuClick={handleMenuClick}
        onAddStudent={() => setAddDialogOpen(true)}
        getStudentStats={getStudentStats}
        searchQuery={searchQuery}
      />

      {/* Context Menu */}
      <StudentActionsMenu
        anchorEl={menuAnchor}
        student={menuStudent}
        onClose={() => setMenuAnchor(null)}
        onViewProfile={handleStudentClick}
        onRemoveStudent={handleRemoveStudent}
      />

      {/* Add Student Dialog */}
      <AddStudentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddStudent}
      />

      {/* Import Roster Dialog */}
      <ImportRosterDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportRoster}
      />

      {/* Student Profile Modal */}
      <StudentProfileModal
        open={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        assignments={assignments}
      />

    </Box>
  );
}
