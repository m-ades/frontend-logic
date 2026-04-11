// Utility functions for roster management
import {
  listPastDueGradedAssignments,
  averagePercentPastDueAssignmentsRounded,
} from "./studentGradeAverage.js";

export function getStudentStats(student, assignments) {
  const pastDue = listPastDueGradedAssignments(assignments || []);
  const pastDueIds = new Set(
    pastDue
      .map((a) => Number(a.id))
      .filter((id) => Number.isFinite(id))
  );
  const pastDueCount = pastDue.length;
  const average =
    pastDueCount > 0
      ? averagePercentPastDueAssignmentsRounded(student, assignments || [], undefined, pastDue)
      : 0;
  const gradesObj = student.grades || {};
  const completed = pastDue.filter((a) => {
    const id = Number(a.id);
    if (!Number.isFinite(id)) return false;
    const g = gradesObj[id] ?? gradesObj[String(id)];
    const submitted =
      student.submittedAssignments?.[id] ||
      student.submittedAssignments?.[String(id)];
    return Boolean(submitted) || (typeof g === "number" && g > 0);
  }).length;
  const lateCount = Object.entries(student.lateSubmissions || {}).filter(
    ([assignmentId, isLate]) =>
      Boolean(isLate) && pastDueIds.has(Number(assignmentId))
  ).length;

  return { average, completed, lateCount, pastDueCount };
}

export function filterStudents(students, searchQuery) {
  return students.filter(
    (student) =>
      student.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
}

/** Students only (excludes TAs) for roster analytics. */
function studentsOnlyForStats(students) {
  return Array.isArray(students)
    ? students.filter((s) => s.role !== "ta")
    : [];
}

export function calculateClassStats(students, assignments) {
  const forStats = studentsOnlyForStats(students);
  const totalStudents = forStats.length;

  const averageClassGrade =
    totalStudents > 0
      ? Math.round(
          forStats.reduce((sum, s) => {
            const stats = getStudentStats(s, assignments);
            return sum + stats.average;
          }, 0) / totalStudents
        )
      : 0;

  const studentsAtRisk = forStats.filter((s) => {
    const stats = getStudentStats(s, assignments);
    return (stats.pastDueCount ?? 0) > 0 && stats.average < 70;
  }).length;

  return { totalStudents, averageClassGrade, studentsAtRisk };
}

export function exportRosterCSV(students, courseCode, assignments) {
  const csv = [
    [
      "Username",
      "Average",
      "Assignments Completed",
      "Late Submissions",
    ].join(","),
    ...students.map((student) => {
      const stats = getStudentStats(student, assignments);
      return [
        student.username,
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
  a.download = `${courseCode || "course"}_roster.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function generateCSVTemplate() {
  const csv = [
    "username,password",
    "johnsmith,student123",
    "janesmith,secure456",
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roster_template.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}

// Bulk import students from CSV
export async function bulkImportStudents(dispatch, courseId, studentsData) {
  const results = {
    successful: [],
    failed: [],
  };

  for (const studentData of studentsData) {
    try {
      // Import uses addStudentToCourse from CoursesContext
      // In the actual component, you'd call addStudentToCourse directly
      results.successful.push(studentData);
    } catch (error) {
      results.failed.push({
        ...studentData,
        error: error.message,
      });
    }
  }

  return results;
}
