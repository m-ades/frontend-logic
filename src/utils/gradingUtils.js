/**
 * Get letter grade based on percentage and course grading scale
 * @param {number} percentage - The grade percentage (0-100)
 * @param {Array} gradingScale - The course's grading scale configuration
 * @returns {string} The letter grade
 */
export function getLetterGrade(percentage, gradingScale) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return "—";
  }

  // Find the grade range that includes this percentage
  const grade = gradingScale.find(
    (g) => percentage >= g.minPercent && percentage <= g.maxPercent
  );

  return grade ? grade.letter : "—";
}

/**
 * Get color for a grade based on course grading scale
 * @param {number} percentage - The grade percentage (0-100)
 * @param {Array} gradingScale - The course's grading scale configuration
 * @returns {string} MUI color name or hex color
 */
export function getGradeColor(percentage, gradingScale) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return "default";
  }

  const grade = gradingScale.find(
    (g) => percentage >= g.minPercent && percentage <= g.maxPercent
  );

  return grade ? grade.color : "default";
}

/**
 * Get MUI chip color variant based on percentage
 * Maps custom colors to MUI's standard color props
 * @param {number} percentage - The grade percentage (0-100)
 * @param {Array} gradingScale - The course's grading scale configuration
 * @returns {string} MUI color variant (success, info, warning, error, default)
 */
export function getGradeColorVariant(percentage, gradingScale) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return "default";
  }

  const grade = gradingScale.find(
    (g) => percentage >= g.minPercent && percentage <= g.maxPercent
  );

  if (!grade) return "default";

  // Map common colors to MUI variants
  const colorMap = {
    "#10b981": "success", // green
    "#6366f1": "info", // blue
    "#f59e0b": "warning", // yellow/orange
    "#f97316": "warning", // orange
    "#ef4444": "error", // red
  };

  return colorMap[grade.color] || "default";
}

/**
 * Calculate grade distribution based on grading scale
 * @param {Array} students - Array of student objects with grades
 * @param {Array} gradingScale - The course's grading scale configuration
 * @returns {Array} Distribution array with counts for each grade level
 */
export function calculateGradeDistribution(students, gradingScale) {
  // Initialize distribution with the custom grading scale
  const distribution = gradingScale.map((grade) => ({
    grade: grade.letter,
    range: `${grade.minPercent}-${grade.maxPercent}`,
    count: 0,
    color: grade.color,
    minPercent: grade.minPercent,
    maxPercent: grade.maxPercent,
  }));

  students.forEach((student) => {
    const grades = Object.values(student.grades).filter(
      (g) => g !== undefined && g !== null && !isNaN(g)
    );

    if (grades.length === 0) return;

    const average = Math.round(
      grades.reduce((sum, g) => sum + g, 0) / grades.length
    );

    // Find which grade bracket this average falls into
    const gradeIndex = distribution.findIndex(
      (d) => average >= d.minPercent && average <= d.maxPercent
    );

    if (gradeIndex !== -1) {
      distribution[gradeIndex].count++;
    }
  });

  return distribution;
}

/**
 * Get students at risk based on a threshold
 * @param {Array} students - Array of student objects
 * @param {Array} assignments - Array of assignments
 * @param {number} threshold - Grade percentage threshold (default 70)
 * @returns {Array} Students below threshold, sorted by average
 */
export function getStudentsAtRisk(students, assignments, threshold = 70) {
  return students
    .map((student) => {
      const grades = Object.values(student.grades).filter(
        (g) => g !== undefined && g !== null && !isNaN(g)
      );
      const avg =
        grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
          : 0;
      const missing = assignments.length - grades.length;
      return { ...student, avg, missing };
    })
    .filter((s) => s.avg < threshold && s.avg > 0)
    .sort((a, b) => a.avg - b.avg);
}

/**
 * Check if a grade is passing based on grading scale
 * Typically, the lowest passing grade is anything above the lowest grade level
 * @param {number} percentage - The grade percentage
 * @param {Array} gradingScale - The course's grading scale configuration
 * @returns {boolean} True if passing
 */
export function isPassingGrade(percentage, gradingScale) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return false;
  }

  // Sort grading scale by minPercent to find the lowest grade
  const sortedScale = [...gradingScale].sort(
    (a, b) => a.minPercent - b.minPercent
  );

  // If there's only one grade level, use a default threshold of 60
  if (sortedScale.length <= 1) {
    return percentage >= 60;
  }

  // A passing grade is anything above the lowest grade level
  const lowestPassingGrade = sortedScale[1]; // Second lowest (skip F or equivalent)
  return percentage >= lowestPassingGrade.minPercent;
}

/**
 * Get default grading scale (traditional letter grades)
 * @returns {Array} Default grading scale
 */
export function getDefaultGradingScale() {
  return [
    { letter: "A", minPercent: 90, maxPercent: 100, color: "#10b981" },
    { letter: "B", minPercent: 80, maxPercent: 89, color: "#6366f1" },
    { letter: "C", minPercent: 70, maxPercent: 79, color: "#f59e0b" },
    { letter: "D", minPercent: 60, maxPercent: 69, color: "#f97316" },
    { letter: "F", minPercent: 0, maxPercent: 59, color: "#ef4444" },
  ];
}
