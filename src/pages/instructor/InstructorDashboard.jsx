import { Box, Typography, Alert } from "@mui/material";
import { TrendingUp, Users, CheckCircle, Calendar } from "lucide-react";
import {
  useCoursesState,
  calculateAssignmentAverage,
  generateAvgTime,
  calculateGradeDistribution,
} from "../../context/CoursesContext";
import { MetricCard } from "../../components/ui/MetricCard";
import { PerformanceTrendsChart } from "../../components/ui/dashboard/PerformanceTrendsChart";
import { GradeDistributionChart } from "../../components/ui/dashboard/GradeDistributionChart";
import { StudentsAtRiskTable } from "../../components/ui/dashboard/StudentsAtRiskTable";
import { UpcomingDeadlinesTable } from "../../components/ui/dashboard/UpcomingDeadlinesTable";
import { AssignmentOverviewTable } from "../../components/ui/dashboard/AssignmentOverviewTable";

export default function InstructorDashboard() {
  const { courses, activeCourseId, assignmentsByCourse, gradebookByCourse } =
    useCoursesState();

  const course = courses.find((c) => c.id === activeCourseId);
  const assignments = assignmentsByCourse[activeCourseId] || [];
  const students = gradebookByCourse[activeCourseId] || [];

  // Enrich assignments with calculated data
  const enrichedAssignments = assignments.map((assignment) => {
    const average = calculateAssignmentAverage(assignment.id, students);
    const avgTime = generateAvgTime(assignment.id);
    const submissions = students.filter(
      (student) => student.grades[assignment.id] !== undefined
    ).length;
    const totalStudents = course?.studentCount || students.length || 0;

    return {
      ...assignment,
      average,
      avgTime,
      submissions,
      totalStudents,
      // Format due date for display
      dueDate: new Date(assignment.dueDate).toLocaleDateString(),
    };
  });

  // Pass the course's grading scale to calculateGradeDistribution
  const gradeDistribution = calculateGradeDistribution(
    students,
    course?.gradingScale
  );

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
    // This can be used for chart clicks or other navigation
    console.log("Assignment clicked:", data);
  };

  // Show message if no course selected
  if (!activeCourseId || !course) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={600} mb={2}>
          Dashboard
        </Typography>
        <Alert severity="info">
          Please select a course from the sidebar to view the dashboard.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* Header */}
      <Box>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of {course.name}
        </Typography>
      </Box>

      {/* Metric Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        <MetricCard
          title="Class Average"
          value={`${totalAverage}%`}
          subtitle="Across all assignments"
          icon={TrendingUp}
          gradient={["#10b981", "#059669"]}
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${totalSubmissions} of ${totalPossible}`}
          icon={CheckCircle}
          gradient={["#3b82f6", "#2563eb"]}
        />
        <MetricCard
          title="Total Students"
          value={students.length}
          subtitle="Enrolled in course"
          icon={Users}
          gradient={["#8b5cf6", "#7c3aed"]}
        />
        <MetricCard
          title="Assignments"
          value={assignments.length}
          subtitle="Total posted"
          icon={Calendar}
          gradient={["#ec4899", "#db2777"]}
        />
      </Box>

      {/* Charts */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
        }}
      >
        <PerformanceTrendsChart
          data={enrichedAssignments}
          onAssignmentClick={handleAssignmentClick}
        />
        <GradeDistributionChart data={gradeDistribution} />
      </Box>

      {/* Assignment Overview Table */}
      <AssignmentOverviewTable
        assignments={enrichedAssignments}
        totalAverage={totalAverage}
        totalSubmissions={totalSubmissions}
        totalPossible={totalPossible}
        completionRate={completionRate}
      />

      {/* Students at Risk and Upcoming Deadlines Tables */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
        }}
      >
        <StudentsAtRiskTable students={students} assignments={assignments} />
        <UpcomingDeadlinesTable
          assignments={assignments}
          onAssignmentClick={handleAssignmentClick}
        />
      </Box>
    </Box>
  );
}
