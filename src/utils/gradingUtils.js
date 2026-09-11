import { numberOrNull } from "./numberUtils.js";
import { getStudentAverage } from "./GradebookUtils.js";

// selects the highest lower bound cleared without rounding and returns no match for invalid grades
function findGrade(percentage, gradingScale) {
  const value = numberOrNull(percentage);
  if (value === null) return undefined;
  return [...gradingScale]
    .sort((a, b) => b.minPercent - a.minPercent)
    .find((grade) => value >= grade.minPercent);
}

// returns the letter for the unrounded percentage or a dash when no grade matches
export function getLetterGrade(percentage, gradingScale) {
  const grade = findGrade(percentage, gradingScale);

  return grade ? grade.letter : "—";
}

// returns the color for the unrounded percentage or default when no grade matches
export function getGradeColor(percentage, gradingScale) {
  const grade = findGrade(percentage, gradingScale);

  return grade ? grade.color : "default";
}

// returns the standard chip color for the unrounded percentage or default when unavailable
export function getGradeColorVariant(percentage, gradingScale) {
  const grade = findGrade(percentage, gradingScale);

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

// counts unrounded student averages in scale order with default scale fallback and skips missing or unmatched grades
export function calculateGradeDistribution(students, gradingScale) {
  const scale = Array.isArray(gradingScale) ? gradingScale : getDefaultGradingScale();
  const distribution = scale.map((grade) => ({
    grade: grade.letter,
    range: `${grade.minPercent}-${grade.maxPercent}`,
    count: 0,
    color: grade.color,
    minPercent: grade.minPercent,
    maxPercent: grade.maxPercent,
  }));

  students.forEach((student) => {
    const grade = findGrade(getStudentAverage(student), scale);
    if (grade) distribution[scale.indexOf(grade)].count++;
  });

  return distribution;
}

// checks the unrounded percentage against the lowest passing bound and returns false for invalid grades
export function isPassingGrade(percentage, gradingScale) {
  percentage = numberOrNull(percentage);
  if (percentage === null) {
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
