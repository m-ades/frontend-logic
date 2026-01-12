// Calculate average grade from grades object
export function calculateAverage(grades) {
  const values = Object.values(grades);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
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
      const average = calculateAverage(student.grades);
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
      aValue = calculateAverage(a.grades);
      bValue = calculateAverage(b.grades);
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
