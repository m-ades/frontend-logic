import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  alpha,
} from "@mui/material";
import {
  Plus,
  Search,
  MoreVertical,
  Mail,
  Edit,
  Trash2,
  UserX,
  Download,
  Upload,
} from "lucide-react";
import {
  useCoursesState,
  useCoursesDispatch,
  addStudentToCourse,
  removeStudentFromCourse,
  updateStudentInCourse,
} from "../../context/CoursesContext";
import AddStudentDialog from "../../components/ui/AddStudentDialog";
import StudentProfileModal from "../../components/ui/StudentProfileModal";
import EditStudentDialog from "../../components/ui/EditStudentDialog";
import { MetricCard } from "../../components/ui/MetricCard";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

export default function InstructorRoster() {
  const { activeCourseId, gradebookByCourse, assignmentsByCourse, courses } =
    useCoursesState();
  const dispatch = useCoursesDispatch();

  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuStudent, setMenuStudent] = useState(null);

  // Get current course data
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const students = gradebookByCourse[activeCourseId] || [];
  const assignments = assignmentsByCourse[activeCourseId] || [];

  // Filter students based on search
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate student stats
  const getStudentStats = (student) => {
    const grades = Object.values(student.grades || {}).filter(
      (g) => g !== undefined && g !== null
    );
    const average =
      grades.length > 0
        ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
        : 0;
    const completed = grades.length;
    const lateCount = Object.values(student.lateSubmissions || {}).filter(
      Boolean
    ).length;

    return { average, completed, lateCount };
  };

  // Handlers
  const handleAddStudent = async (studentData) => {
    await addStudentToCourse(dispatch, activeCourseId, studentData);
    setAddDialogOpen(false);
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setProfileModalOpen(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleUpdateStudent = async (studentData) => {
    await updateStudentInCourse(
      dispatch,
      activeCourseId,
      selectedStudent.id,
      studentData
    );
    setEditDialogOpen(false);
    setSelectedStudent(null);
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

  const handleSendEmail = (student) => {
    window.location.href = `mailto:${student.email}`;
    setMenuAnchor(null);
  };

  const handleExportRoster = () => {
    const csv = [
      [
        "Name",
        "Email",
        "Average",
        "Assignments Completed",
        "Late Submissions",
      ].join(","),
      ...filteredStudents.map((student) => {
        const stats = getStudentStats(student);
        return [
          student.name,
          student.email,
          `${stats.average}%`,
          stats.completed,
          stats.lateCount,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeCourse?.code || "course"}_roster.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportRoster = () => {
    // TODO: Implement CSV import
    alert("CSV import coming soon!");
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
  const totalStudents = students.length;

  const averageClassGrade =
    totalStudents > 0
      ? Math.round(
          students.reduce((sum, s) => {
            const stats = getStudentStats(s);
            return sum + stats.average;
          }, 0) / totalStudents
        )
      : 0;

  const studentsAtRisk = students.filter((s) => {
    const stats = getStudentStats(s);
    return stats.average < 70 && stats.average > 0;
  }).length;

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Course Roster
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeCourse?.code} - Manage student enrollment
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Upload size={18} />}
            onClick={handleImportRoster}
            size="small"
          >
            Import CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            onClick={handleExportRoster}
            size="small"
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={20} />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Student
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 2,
          mb: 3,
        }}
      >
        <MetricCard
          title="Total Students"
          value={totalStudents}
          subtitle={`${activeCourse?.code} enrolled`}
          icon={Users}
          gradient={["#3b82f6", "#2563eb"]}
        />

        <MetricCard
          title="Class Average"
          value={`${averageClassGrade}%`}
          subtitle="Across all students"
          icon={TrendingUp}
          gradient={["#22c55e", "#16a34a"]}
        />

        <MetricCard
          title="Students At Risk"
          value={studentsAtRisk}
          subtitle="Below 70% average"
          icon={AlertTriangle}
          gradient={["#f97316", "#ea580c"]}
        />
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={20} />
            </InputAdornment>
          ),
        }}
      />

      {/* Students Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {filteredStudents.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchQuery ? "No students found" : "No students enrolled yet"}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {searchQuery
                ? "Try a different search query"
                : "Add students to get started"}
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                startIcon={<Plus size={20} />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Student
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
                  <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Average
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Grade
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Completed
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Late
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => {
                  const stats = getStudentStats(student);
                  const letterGrade =
                    stats.average >= 90
                      ? "A"
                      : stats.average >= 80
                      ? "B"
                      : stats.average >= 70
                      ? "C"
                      : stats.average >= 60
                      ? "D"
                      : "F";
                  const gradeColor =
                    stats.average >= 90
                      ? "success"
                      : stats.average >= 80
                      ? "info"
                      : stats.average >= 70
                      ? "warning"
                      : stats.average >= 60
                      ? "default"
                      : "error";

                  return (
                    <TableRow
                      key={student.id}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: alpha("#3b82f6", 0.04),
                        },
                      }}
                    >
                      <TableCell onClick={() => handleStudentClick(student)}>
                        <Typography variant="body2" fontWeight={500}>
                          {student.name}
                        </Typography>
                      </TableCell>

                      <TableCell onClick={() => handleStudentClick(student)}>
                        <Typography variant="body2" color="text.secondary">
                          {student.email}
                        </Typography>
                      </TableCell>

                      <TableCell
                        align="center"
                        onClick={() => handleStudentClick(student)}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            stats.average < 70 && stats.average > 0
                              ? "error.main"
                              : "text.primary"
                          }
                        >
                          {stats.average > 0 ? `${stats.average}%` : "—"}
                        </Typography>
                      </TableCell>

                      <TableCell
                        align="center"
                        onClick={() => handleStudentClick(student)}
                      >
                        {stats.average > 0 ? (
                          <Chip
                            label={letterGrade}
                            color={gradeColor}
                            size="small"
                            sx={{ fontWeight: 600, minWidth: 40 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                        onClick={() => handleStudentClick(student)}
                      >
                        <Typography variant="body2">
                          {stats.completed}
                        </Typography>
                      </TableCell>

                      <TableCell
                        align="center"
                        onClick={() => handleStudentClick(student)}
                      >
                        {stats.lateCount > 0 ? (
                          <Chip
                            label={stats.lateCount}
                            size="small"
                            color="warning"
                            sx={{ minWidth: 32 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="More Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuAnchor(e.currentTarget);
                              setMenuStudent(student);
                            }}
                          >
                            <MoreVertical size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => handleStudentClick(menuStudent)}>
          <Edit size={16} style={{ marginRight: 8 }} />
          View Profile
        </MenuItem>
        <MenuItem onClick={() => handleSendEmail(menuStudent)}>
          <Mail size={16} style={{ marginRight: 8 }} />
          Send Email
        </MenuItem>
        <MenuItem onClick={() => handleEditStudent(menuStudent)}>
          <Edit size={16} style={{ marginRight: 8 }} />
          Edit Student
        </MenuItem>
        <MenuItem
          onClick={() => handleRemoveStudent(menuStudent?.id)}
          sx={{ color: "error.main" }}
        >
          <UserX size={16} style={{ marginRight: 8 }} />
          Remove from Course
        </MenuItem>
      </Menu>

      {/* Add Student Dialog */}
      <AddStudentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddStudent}
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

      {/* Edit Student Dialog */}
      <EditStudentDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleUpdateStudent}
        student={selectedStudent}
      />
    </Box>
  );
}
