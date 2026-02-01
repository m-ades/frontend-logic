// Utility functions for roster management
import { parseDueDateAsEastern } from "./easternTime.js";

const getAssignmentDeadline = (assignment) => {
  if (!assignment?.dueDate) return null;
  const deadline = parseDueDateAsEastern(assignment.dueDate, assignment.dueTime);
  return deadline && !Number.isNaN(deadline.getTime()) ? deadline : null;
};

const getPastDueAssignmentIds = (assignments) => {
  if (!Array.isArray(assignments) || assignments.length === 0) return null;
  const now = new Date();
  const ids = new Set();
  assignments.forEach((assignment) => {
    const deadline = getAssignmentDeadline(assignment);
    if (!deadline || deadline > now) return;
    const assignmentId = Number(assignment.id);
    if (Number.isFinite(assignmentId)) {
      ids.add(assignmentId);
    }
  });
  return ids;
};

export function getStudentStats(student, assignments) {
  const pastDueAssignmentIds = getPastDueAssignmentIds(assignments);
  const grades = Object.entries(student.grades || {})
    .filter(
      ([assignmentId, grade]) =>
        grade !== undefined &&
        grade !== null &&
        (!pastDueAssignmentIds ||
          pastDueAssignmentIds.has(Number(assignmentId)))
    )
    .map(([, grade]) => grade);
  const average =
    grades.length > 0
      ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
      : 0;
  const completed = grades.length;
  const lateCount = Object.entries(student.lateSubmissions || {}).filter(
    ([assignmentId, isLate]) =>
      Boolean(isLate) &&
      (!pastDueAssignmentIds || pastDueAssignmentIds.has(Number(assignmentId)))
  ).length;

  return { average, completed, lateCount };
}

export function filterStudents(students, searchQuery) {
  return students.filter(
    (student) =>
      student.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
}

/** Students onlyfor analytics */
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
    return stats.average < 70 && stats.average > 0;
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
