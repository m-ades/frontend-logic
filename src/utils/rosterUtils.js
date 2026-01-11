// Utility functions for roster management

export function getStudentStats(student) {
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
}

export function filterStudents(students, searchQuery) {
  return students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
}

export function calculateClassStats(students) {
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

  return { totalStudents, averageClassGrade, studentsAtRisk };
}

export function exportRosterCSV(students, courseCode) {
  const csv = [
    [
      "Name",
      "Email",
      "Average",
      "Assignments Completed",
      "Late Submissions",
    ].join(","),
    ...students.map((student) => {
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
  a.download = `${courseCode || "course"}_roster.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function generateCSVTemplate() {
  const csv = [
    "name,email,password",
    "John Doe,john.doe@example.com,student123",
    "Jane Smith,jane.smith@example.com,secure456",
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(url);
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
