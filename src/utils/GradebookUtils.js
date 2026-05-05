// Calculate average grade from grades object
export function calculateAverage(grades) {
  const values = Object.values(grades);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function getStudentAverage(student) {
  return Number.isFinite(Number(student?.average))
    ? Number(student.average)
    : calculateAverage(student?.grades || {});
}

// Get letter grade from numeric grade
export function getLetterGrade(grade) {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}

// Filter students based on search and grade criteria
export function filterStudents(
  students,
  searchTerm,
  selectedAssignment,
  gradeFilter
) {
  return students.filter((student) => {
    // Search filter
    if (
      searchTerm &&
      !student.username.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Assignment-specific grade filter
    if (selectedAssignment !== "all") {
      const grade = student.grades[selectedAssignment];
      if (grade === undefined) return false;

      if (gradeFilter === "a" && grade < 90) return false;
      if (gradeFilter === "b" && (grade < 80 || grade >= 90)) return false;
      if (gradeFilter === "c" && (grade < 70 || grade >= 80)) return false;
      if (gradeFilter === "d" && (grade < 60 || grade >= 70)) return false;
      if (gradeFilter === "f" && grade >= 60) return false;
    } else if (gradeFilter !== "all") {
      // Overall average filter
      const average = getStudentAverage(student);
      if (gradeFilter === "a" && average < 90) return false;
      if (gradeFilter === "b" && (average < 80 || average >= 90)) return false;
      if (gradeFilter === "c" && (average < 70 || average >= 80)) return false;
      if (gradeFilter === "d" && (average < 60 || average >= 70)) return false;
      if (gradeFilter === "f" && average >= 60) return false;
    }

    return true;
  });
}

// Sort students by column
export function sortStudents(students, sortColumn, sortDirection) {
  return [...students].sort((a, b) => {
    let aValue, bValue;

    if (sortColumn === "username") {
      aValue = a.username.toLowerCase();
      bValue = b.username.toLowerCase();
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (sortColumn === "average") {
      aValue = getStudentAverage(a);
      bValue = getStudentAverage(b);
    } else {
      aValue = a.grades[sortColumn] ?? -1;
      bValue = b.grades[sortColumn] ?? -1;
    }

    if (sortDirection === "asc") {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
}

export function exportGradebookCSV(students, assignments, courseLabel) {
  const splitAssignmentTitle = (name = "") => {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      return { title: "Assignment", subtitle: "" };
    }
    const parts = trimmed.split(":");
    if (parts.length === 1) {
      return { title: trimmed, subtitle: "" };
    }
    const title = parts[0].trim();
    const subtitle = parts.slice(1).join(":").trim();
    return { title: title || trimmed, subtitle };
  };

  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const assignmentList = Array.isArray(assignments) ? assignments : [];
  const assignmentHeaders = assignmentList.map(
    (assignment, index) => {
      const rawName = assignment?.name || `Assignment ${index + 1}`;
      const { title } = splitAssignmentTitle(rawName);
      return title || rawName;
    }
  );

  const rows = [
    ["Username", "Average", "Letter Grade", ...assignmentHeaders],
    ...students.map((student) => {
      const average = getStudentAverage(student);
      const letterGrade = getLetterGrade(average);
      const grades = student?.grades || {};
      const assignmentGrades = assignmentList.map((assignment) => {
        const grade = grades[assignment?.id];
        if (grade === undefined || grade === null || Number.isNaN(grade)) {
          return "";
        }
        return `${grade}%`;
      });

      return [
        student?.username ?? "",
        `${average}%`,
        letterGrade,
        ...assignmentGrades,
      ];
    }),
  ];

  const csv = rows
    .map((row) => row.map(escapeCSVValue).join(","))
    .join("\n");

  const baseName = String(courseLabel || "course")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName || "course"}_gradebook.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
