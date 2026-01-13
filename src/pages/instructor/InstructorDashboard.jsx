import { Box, Typography, Alert } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, CheckCircle, Calendar } from "lucide-react";
import {
  useCoursesState,
  calculateAssignmentAverage,
  calculateGradeDistribution,
} from "../../context/CoursesContext";
import { fetchJson } from "../../utils/api.js";
import { MetricCard } from "../../components/ui/MetricCard";
import { PerformanceTrendsChart } from "../../components/ui/dashboard/PerformanceTrendsChart";
import { GradeDistributionChart } from "../../components/ui/dashboard/GradeDistributionChart";
import { StudentsAtRiskTable } from "../../components/ui/dashboard/StudentsAtRiskTable";
import { UpcomingDeadlinesTable } from "../../components/ui/dashboard/UpcomingDeadlinesTable";
import { AssignmentOverviewTable } from "../../components/ui/dashboard/AssignmentOverviewTable";

export default function InstructorDashboard() {
  const { courses, activeCourseId, assignmentsByCourse, gradebookByCourse } =
    useCoursesState();
  const [analytics, setAnalytics] = useState({
    gradeSummary: null,
    assignmentStats: [],
    timeByCategory: [],
  });
  const [gradebookSummary, setGradebookSummary] = useState([]);

  const course = courses.find((c) => c.id === activeCourseId);
  const assignments = assignmentsByCourse[activeCourseId] || [];
  const students = gradebookByCourse[activeCourseId] || [];
  const totalStudents = course?.studentCount || students.length || 0;

  useEffect(() => {
    let isMounted = true;
    const loadAnalytics = async () => {
      if (!activeCourseId) return;
      try {
        const [instructorAnalytics, summary] = await Promise.all([
          fetchJson(`/api/analytics/instructor?courseId=${activeCourseId}`),
          fetchJson(`/api/analytics/gradebook-summary?courseId=${activeCourseId}`),
        ]);
        if (isMounted) {
          setAnalytics(instructorAnalytics);
          setGradebookSummary(summary || []);
        }
      } catch (error) {
        if (isMounted) {
          console.warn("Failed to load instructor analytics", error);
          setAnalytics({ gradeSummary: null, assignmentStats: [], timeByCategory: [] });
          setGradebookSummary([]);
        }
      }
    };

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [activeCourseId]);

  // Enrich assignments with calculated data
  const enrichedAssignments = useMemo(() => {
    const summaryMap = new Map(
      (gradebookSummary || []).map((item) => [item.id, item])
    );
    const statsMap = new Map(
      (analytics.assignmentStats || []).map((item) => [item.id, item])
    );

    return assignments.map((assignment) => {
      const summary = summaryMap.get(assignment.id);
      const stats = statsMap.get(assignment.id);
      const averagePercent = summary?.avg_percent ?? null;
      const average =
        averagePercent !== null && averagePercent !== undefined
          ? Math.round(averagePercent * 100)
          : calculateAssignmentAverage(assignment.id, students);
      const submissions =
        stats?.students_submitted ??
        students.filter((student) => student.grades[assignment.id] !== undefined)
          .length;

      return {
        ...assignment,
        average,
        avgAttempts: stats?.avg_attempt ?? null,
        submissions,
        totalStudents,
        dueDate: assignment.dueDate
          ? new Date(assignment.dueDate).toLocaleDateString()
          : "—",
        lateSubmissions: null,
      };
    });
  }, [assignments, analytics.assignmentStats, gradebookSummary, students, totalStudents]);

  // Pass the course's grading scale to calculateGradeDistribution
  const gradeDistribution = calculateGradeDistribution(
    students,
    course?.gradingScale
  );

  const totalAverage = enrichedAssignments.length > 0
    ? Math.round(
        enrichedAssignments.reduce((sum, a) => sum + a.average, 0) /
          enrichedAssignments.length
      )
    : 0;

  const totalSubmissions = enrichedAssignments.reduce(
    (sum, a) => sum + a.submissions,
    0
  );
  const totalPossible = totalStudents * assignments.length;
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
        value={totalStudents}
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
