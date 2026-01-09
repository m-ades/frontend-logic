import {
  Box,
  Typography,
  Paper,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { TrendingUp, Users, CheckCircle } from "lucide-react";
import { useCoursesState } from "../../context/CoursesContext";

// Get letter grade from numeric grade
function getLetterGrade(grade) {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}

// Get color for grade chip
function getGradeColor(grade) {
  if (grade >= 90) return "success";
  if (grade >= 80) return "info";
  if (grade >= 70) return "warning";
  if (grade >= 60) return "default";
  return "error";
}

// Metric card component for displaying key statistics
const MetricCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <Paper
    elevation={2}
    sx={{
      p: 3,
      height: "100%",
      borderLeft: `4px solid ${color}`,
      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
    }}
  >
    <Stack spacing={1}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color }}>
        <Icon size={20} />
        <Typography
          variant="caption"
          fontWeight={600}
          textTransform="uppercase"
        >
          {title}
        </Typography>
      </Box>
      <Typography variant="h3" fontWeight={700} color={color}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Stack>
  </Paper>
);

// Custom tooltip for the line chart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} mb={1}>
          {data.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Average: <strong>{data.average}%</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Submissions:{" "}
          <strong>
            {data.submissions}/{data.totalStudents}
          </strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Late: <strong>{data.lateSubmissions}</strong>
        </Typography>
        <Typography
          variant="caption"
          sx={{ mt: 1, display: "block", fontStyle: "italic" }}
        >
          Click to view details
        </Typography>
      </Paper>
    );
  }
  return null;
};

export default function InstructorDashboard() {
  const { courses, activeCourseId, assignmentsByCourse, gradebookByCourse } =
    useCoursesState();

  const course = courses.find((c) => c.id === activeCourseId);
  const assignments = assignmentsByCourse[activeCourseId] || [];
  const students = gradebookByCourse[activeCourseId] || [];

  // Calculate average for each assignment
  const calculateAssignmentAverage = (assignmentId) => {
    const grades = students
      .map((student) => student.grades[assignmentId])
      .filter((grade) => grade !== undefined);

    if (grades.length === 0) return 0;
    return Math.round(
      grades.reduce((sum, grade) => sum + grade, 0) / grades.length
    );
  };

  // Build enriched assignment data with calculated averages
  const enrichedAssignments = assignments.map((assignment) => ({
    ...assignment,
    average: calculateAssignmentAverage(assignment.id),
  }));

  // Calculate grade distribution
  const gradeDistribution = [
    { grade: "A (90-100)", count: 0 },
    { grade: "B (80-89)", count: 0 },
    { grade: "C (70-79)", count: 0 },
    { grade: "D (60-69)", count: 0 },
    { grade: "F (0-59)", count: 0 },
  ];

  students.forEach((student) => {
    const grades = Object.values(student.grades).filter((g) => g !== undefined);
    if (grades.length === 0) return;

    const average = Math.round(
      grades.reduce((sum, g) => sum + g, 0) / grades.length
    );

    if (average >= 90) gradeDistribution[0].count++;
    else if (average >= 80) gradeDistribution[1].count++;
    else if (average >= 70) gradeDistribution[2].count++;
    else if (average >= 60) gradeDistribution[3].count++;
    else gradeDistribution[4].count++;
  });

  // Calculate overall statistics
  const totalAverage =
    enrichedAssignments.length > 0
      ? Math.round(
          enrichedAssignments.reduce((sum, a) => sum + a.average, 0) /
            enrichedAssignments.length
        )
      : 0;

  const totalSubmissions = enrichedAssignments.reduce(
    (sum, a) => sum + a.submissions,
    0
  );
  const totalPossible = enrichedAssignments.reduce(
    (sum, a) => sum + a.totalStudents,
    0
  );
  const completionRate =
    totalPossible > 0
      ? Math.round((totalSubmissions / totalPossible) * 100)
      : 0;

  const handleAssignmentClick = (data) => {
    console.log("Navigate to assignment:", data.id);
    // TODO: Replace with router navigation
    // navigate(`/instructor/assignment/${data.id}`)
    alert(`Navigate to ${data.name} (ID: ${data.id})`);
  };

  if (!course) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} mb={3}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">No course selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Dashboard
      </Typography>

      {/* Key metric cards - responsive grid layout */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "1fr 1fr 1fr",
          },
          gap: 3,
          mb: 4,
        }}
      >
        <MetricCard
          title="Class Average"
          value={`${totalAverage}%`}
          subtitle="Across all assignments"
          icon={TrendingUp}
          color="#4caf50"
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${totalSubmissions} of ${totalPossible} submitted`}
          icon={CheckCircle}
          color="#2196f3"
        />
        <MetricCard
          title="Total Students"
          value={students.length}
          subtitle="Enrolled in course"
          icon={Users}
          color="#9c27b0"
        />
      </Box>

      {/* Charts section - responsive grid layout */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
          mb: 4,
        }}
      >
        {/* Assignment Performance Line Chart */}
        <Paper elevation={2} sx={{ height: 420 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Assignment Performance Trends
            </Typography>
          </Box>
          <ResponsiveContainer width="100%" height={330}>
            <LineChart
              data={enrichedAssignments}
              margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="name"
                interval={0}
                padding={{ left: 20, right: 20 }}
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                width={40}
                stroke="#666"
                label={{
                  value: "Average (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#1976d2"
                strokeWidth={3}
                dot={{ fill: "#1976d2", r: 6, cursor: "pointer" }}
                activeDot={{
                  r: 8,
                  cursor: "pointer",
                  onClick: (_, data) => handleAssignmentClick(data.payload),
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        {/* Grade Distribution Bar Chart */}
        <Paper elevation={2} sx={{ height: 420 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Grade Distribution
            </Typography>
          </Box>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={gradeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {gradeDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      ["#4caf50", "#8bc34a", "#ffc107", "#ff9800", "#f44336"][
                        index
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      {/* Assignment Averages Table */}
      <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Assignment Performance Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Class averages and submission rates for each assignment
          </Typography>
        </Box>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Assignment</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Class Average
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Letter Grade
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Submissions
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Completion Rate
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Late Submissions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrichedAssignments.map((assignment) => {
                const letterGrade = getLetterGrade(assignment.average);
                const gradeColor = getGradeColor(assignment.average);
                const assignmentCompletionRate = Math.round(
                  (assignment.submissions / assignment.totalStudents) * 100
                );

                return (
                  <TableRow
                    key={assignment.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => handleAssignmentClick(assignment)}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>
                      {assignment.name}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {assignment.dueDate}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {assignment.average}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={letterGrade}
                        color={gradeColor}
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 45 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {assignment.submissions}/{assignment.totalStudents}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2">
                          {assignmentCompletionRate}%
                        </Typography>
                        {assignmentCompletionRate === 100 && (
                          <CheckCircle size={16} color="#4caf50" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {assignment.lateSubmissions > 0 ? (
                        <Chip
                          label={assignment.lateSubmissions}
                          size="small"
                          color="warning"
                          sx={{ minWidth: 35 }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {/* Summary row */}
        <Box
          sx={{
            p: 2,
            backgroundColor: "action.hover",
            borderTop: "2px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={4} justifyContent="center">
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Overall Average
              </Typography>
              <Typography variant="h6" fontWeight={600} color="primary.main">
                {totalAverage}%
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Total Submissions
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {totalSubmissions}/{totalPossible}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Avg Completion Rate
              </Typography>
              <Typography variant="h6" fontWeight={600} color="success.main">
                {completionRate}%
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
