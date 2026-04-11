import { DEFAULT_GRADING_SCALE } from "./gradingScaleDefaults.js";

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
  return DEFAULT_GRADING_SCALE.map((g) => ({ ...g }));
}

export { calculateGradeDistribution, getStudentsAtRisk } from "./pastDueGradeRollups.js";
