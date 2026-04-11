import {
  averagePercentPastDueAssignments,
  averagePercentPastDueAssignmentsRounded,
  listPastDueGradedAssignments,
} from "./studentGradeAverage.js";
import { DEFAULT_GRADING_SCALE } from "./gradingScaleDefaults.js";

/**
 * Histogram of students by letter bucket, using each student's **past-due-only**
 * average (see `studentGradeAverage.js`).
 *
 * @param {Array<object>} students - Gradebook-shaped students (`grades`, etc.)
 * @param {Array<object>|undefined} gradingScale - Course scale; falls back to default
 * @param {Array<object>} assignments - Assignments used to determine past due
 */
export function calculateGradeDistribution(students, gradingScale, assignments = []) {
  const scale =
    gradingScale && Array.isArray(gradingScale) ? gradingScale : DEFAULT_GRADING_SCALE;

  const distribution = scale.map((grade) => ({
    grade: grade.letter,
    range: `${grade.minPercent}-${grade.maxPercent}`,
    count: 0,
    color: grade.color,
    minPercent: grade.minPercent,
    maxPercent: grade.maxPercent,
  }));

  students.forEach((student) => {
    const avg = averagePercentPastDueAssignments(student, assignments);
    if (avg === null) return;

    const average = Math.round(avg);

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
 * Students whose **past-due-only** rounded average is below `threshold`, with a
 * `missing` count of past-due slots with no submission and no grade.
 */
export function getStudentsAtRisk(students, assignments, threshold = 70) {
  const pastDue = listPastDueGradedAssignments(assignments || []);
  return students
    .map((student) => {
      const avg = averagePercentPastDueAssignmentsRounded(
        student,
        assignments || [],
        undefined,
        pastDue
      );
      const missing = pastDue.filter((a) => {
        const id = Number(a.id);
        if (!Number.isFinite(id)) return false;
        const submitted =
          student.submittedAssignments?.[id] ||
          student.submittedAssignments?.[String(id)];
        if (submitted) return false;
        const g = student.grades?.[id] ?? student.grades?.[String(id)];
        return g === undefined || g === null;
      }).length;
      return { ...student, avg, missing };
    })
    .filter((s) => pastDue.length > 0 && s.avg < threshold)
    .sort((a, b) => a.avg - b.avg);
}
