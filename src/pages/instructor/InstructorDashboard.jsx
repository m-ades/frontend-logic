import { Box, Typography } from "@mui/material";
import { TrendingUp, Users, CheckCircle, Calendar } from "lucide-react";
import {
  useCoursesState,
  calculateAssignmentAverage,
  generateAvgTime,
  calculateGradeDistribution,
} from "../../context/CoursesContext";
import { MetricCard } from "../../components/ui/dashboard/MetricCard";
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

  // Use helper functions from context
  const enrichedAssignments = assignments.map((assignment) => ({
    ...assignment,
    average: calculateAssignmentAverage(assignment.id, students),
    avgTime: generateAvgTime(assignment.id),
  }));

  const gradeDistribution = calculateGradeDistribution(students);

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
    alert(`Navigate to ${data.name} (ID: ${data.id})`);
  };

  if (!course) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={600} mb={2}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">No course selected</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        p: { xs: 2, md: 4 },
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
        onAssignmentClick={handleAssignmentClick}
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
