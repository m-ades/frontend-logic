import { Box, Typography, Alert, LinearProgress, useTheme } from "@mui/material";
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
import { sortAssignmentsBySubchapter } from "../../utils/assignmentSort.js";
import { formatEasternDateTime } from "../../utils/easternTime.js";

export default function InstructorDashboard() {
  const theme = useTheme();
  const { courses, activeCourseId, assignmentsByCourse, gradebookByCourse } =
    useCoursesState();
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [analytics, setAnalytics] = useState({
    gradeSummary: null,
    assignmentStats: [],
    timeByCategory: [],
  });
  const [gradebookSummary, setGradebookSummary] = useState([]);

  const course = courses.find((c) => c.id === activeCourseId);
  const assignments = sortAssignmentsBySubchapter(assignmentsByCourse[activeCourseId] || []);
  const students = gradebookByCourse[activeCourseId] || [];
  const studentsForStats = useMemo(
    () => students.filter((s) => s.role !== "ta"),
    [students]
  );
  const totalStudents = course?.studentCount ?? studentsForStats.length;

  useEffect(() => {
    let isMounted = true;
    const loadAnalytics = async () => {
      if (!activeCourseId) {
        if (isMounted) setIsLoadingAnalytics(false);
        return;
      }
      try {
        const [instructorAnalytics, summary] = await Promise.all([
          fetchJson(`/api/analytics/instructor-dashboard?courseId=${activeCourseId}`),
          fetchJson(`/api/analytics/gradebook-summary?courseId=${activeCourseId}`),
        ]);
        if (isMounted) {
          setAnalytics(instructorAnalytics);
          setGradebookSummary(Array.isArray(summary) ? summary : (summary?.assignments ?? []));
        }
      } catch (error) {
        if (isMounted) {
          console.warn("Failed to load instructor analytics", error);
          setAnalytics({ gradeSummary: null, assignmentStats: [], timeByCategory: [] });
          setGradebookSummary([]);
        }
      } finally {
        if (isMounted) setIsLoadingAnalytics(false);
      }
    };

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [activeCourseId]);

  const nonPracticeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.kind !== "practice"),
    [assignments]
  );

  const nonPracticeIds = useMemo(
    () => new Set(nonPracticeAssignments.map((assignment) => Number(assignment.id))),
    [nonPracticeAssignments]
  );

  const filteredGradebookSummary = useMemo(
    () => (gradebookSummary || []).filter((item) => nonPracticeIds.has(Number(item.id))),
    [gradebookSummary, nonPracticeIds]
  );

  const filteredAssignmentStats = useMemo(
    () => (analytics.assignmentStats || []).filter((item) => nonPracticeIds.has(Number(item.id))),
    [analytics.assignmentStats, nonPracticeIds]
  );

  const studentsForAssignments = useMemo(
    () =>
      studentsForStats.map((student) => {
        const filteredGrades = Object.entries(student.grades || {}).reduce(
          (acc, [assignmentId, grade]) => {
            const numericId = Number(assignmentId);
            if (nonPracticeIds.has(numericId)) {
              acc[assignmentId] = grade;
            }
            return acc;
          },
          {}
        );
        return { ...student, grades: filteredGrades };
      }),
    [studentsForStats, nonPracticeIds]
  );

  // Enrich assignments with calculated data
  const enrichedAssignments = useMemo(() => {
    const summaryMap = new Map(
      (filteredGradebookSummary || []).map((item) => [Number(item.id), item])
    );
    const statsMap = new Map(
      (filteredAssignmentStats || []).map((item) => [Number(item.id), item])
    );

    return nonPracticeAssignments.map((assignment) => {
      const summary = summaryMap.get(Number(assignment.id));
      const stats = statsMap.get(Number(assignment.id));
      const averagePercent = summary?.avg_percent ?? null;
      const average =
        averagePercent !== null && averagePercent !== undefined
          ? Math.round(averagePercent * 100)
          : calculateAssignmentAverage(assignment.id, studentsForAssignments);
      const submissionsFallback = studentsForAssignments.filter(
        (student) => Boolean(student.submittedAssignments?.[assignment.id])
      ).length;
      const submissionsRaw =
        stats?.students_submitted ?? submissionsFallback;
      const submissions = totalStudents
        ? Math.min(submissionsRaw, totalStudents)
        : submissionsRaw;
      const medianMinutesPerQuestion =
        typeof stats?.median_minutes_per_question === "number"
          ? stats.median_minutes_per_question
          : typeof stats?.median_minutes === "number"
          ? stats.median_minutes
          : null;
      const avgMinutesPerQuestion =
        typeof stats?.avg_minutes_per_question === "number"
          ? stats.avg_minutes_per_question
          : null;
      const dueAtValue = assignment.dueAt
        || (assignment.dueDate
          ? `${assignment.dueDate}T${assignment.dueTime || "23:59:59"}`
          : null);
      const dueAt = dueAtValue ? new Date(dueAtValue) : null;
      return {
        ...assignment,
        average,
        avgAttempts: stats?.avg_attempt ?? null,
        medianMinutesPerQuestion,
        avgMinutesPerQuestion,
        submissions,
        totalStudents,
        dueDate: formatEasternDateTime(assignment.dueDate, assignment.dueTime) ?? "—",
        dueAt,
        lateSubmissions: null,
      };
    });
  }, [
    filteredAssignmentStats,
    filteredGradebookSummary,
    nonPracticeAssignments,
    studentsForAssignments,
    totalStudents,
  ]);

  // Pass the course's grading scale to calculateGradeDistribution
  const gradeDistribution = calculateGradeDistribution(
    studentsForAssignments,
    course?.gradingScale
  );

  const isGradedAndUnlocked = (assignment) => {
    const hasSubmissions = assignment.submissions > 0;
    const wasEverUnlocked = hasSubmissions || assignment.isLocked === false;
    return hasSubmissions && wasEverUnlocked;
  };

  const gradedUnlockedAssignments = useMemo(
    () => enrichedAssignments.filter(isGradedAndUnlocked),
    [enrichedAssignments]
  );
  const unlockedAssignments = useMemo(
    () => nonPracticeAssignments.filter((assignment) => !assignment.isLocked),
    [nonPracticeAssignments]
  );

  const gradedPastDueAssignments = useMemo(
    () =>
      gradedUnlockedAssignments.filter(
        (assignment) => assignment.dueAt && assignment.dueAt <= new Date()
      ),
    [gradedUnlockedAssignments]
  );

  const totalAverage = gradedPastDueAssignments.length > 0
    ? Math.round(
        gradedPastDueAssignments.reduce((sum, a) => sum + a.average, 0) /
          gradedPastDueAssignments.length
      )
    : 0;

  const totalSubmissions = enrichedAssignments.reduce(
    (sum, a) => sum + a.submissions,
    0
  );
  const totalPossible = totalStudents * nonPracticeAssignments.length;
  const completionRate =
    totalPossible > 0
      ? Math.round((Math.min(totalSubmissions, totalPossible) / totalPossible) * 100)
      : 0;

  const timeByCategory = analytics.timeByCategory || [];

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
    <>
      {isLoadingAnalytics && (
        <LinearProgress sx={{ position: "sticky", top: 0, zIndex: 10, mb: 0 }} />
      )}
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
          gradient={[theme.palette.primary.main, theme.palette.primary.dark]}
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
          value={unlockedAssignments.length}
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

      {/* Time-on-task by category */}
      <Box>
        <Typography variant="h6" fontWeight={600} mb={1}>
          Time-on-task by category
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Average active minutes students spend, grouped by assignment category.
        </Typography>
        {timeByCategory.length === 0 ? (
          <Alert severity="info">
            Time-on-task analytics are not yet available for this course.
          </Alert>
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {timeByCategory.map((item) => (
                <li key={item.key || item.category || item.label}>
                  <Typography variant="body2">
                    <strong>{item.label || item.category || item.key}:</strong>{" "}
                    {typeof item.avg_minutes === "number"
                      ? `${Math.round(item.avg_minutes)} mins`
                      : typeof item.avgMinutes === "number"
                      ? `${Math.round(item.avgMinutes)} mins`
                      : "—"}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}
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
        <StudentsAtRiskTable
          students={studentsForAssignments}
          assignments={nonPracticeAssignments}
        />
        <UpcomingDeadlinesTable
          assignments={nonPracticeAssignments}
          onAssignmentClick={handleAssignmentClick}
        />
      </Box>
    </Box>
    </>
  );
}
