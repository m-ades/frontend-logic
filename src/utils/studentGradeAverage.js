import { parseDueDateAsEastern } from "./easternTime.js";

/**
 * Single instant for an assignment's official due (for "past due" checks).
 * Prefer API ISO fields; otherwise Eastern calendar date + time from course UI.
 */
export function getAssignmentDeadlineInstant(assignment) {
  if (!assignment) return null;
  const iso = assignment.dueAt || assignment.due_at;
  if (iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dateStr = assignment.dueDate || assignment.due_date;
  if (!dateStr) return null;
  const timeStr =
    assignment.dueTime ||
    assignment.due_time ||
    "23:59";
  return parseDueDateAsEastern(String(dateStr).slice(0, 10), timeStr);
}

export function isGradedCourseAssignment(assignment) {
  return assignment?.kind !== "practice";
}

export function isAssignmentPastDue(assignment, now = new Date()) {
  if (!isGradedCourseAssignment(assignment)) return false;
  const deadline = getAssignmentDeadlineInstant(assignment);
  if (!deadline) return false;
  return deadline.getTime() <= now.getTime();
}

export function listPastDueGradedAssignments(assignments, now = new Date()) {
  if (!Array.isArray(assignments)) return [];
  return assignments.filter(
    (a) => isGradedCourseAssignment(a) && isAssignmentPastDue(a, now)
  );
}

/**
 * Unrounded mean over past-due graded assignments only. Missing / null grade = 0.
 * Returns null when there are no past-due assignments with a known deadline.
 *
 * @param {object|null} pastDueCached - If provided (e.g. from `listPastDueGradedAssignments`),
 *   skips recomputing the past-due list (same `now` must have been used to build it).
 */
export function averagePercentPastDueAssignments(
  student,
  assignments,
  now = new Date(),
  pastDueCached = null
) {
  const pastDue = Array.isArray(pastDueCached)
    ? pastDueCached
    : listPastDueGradedAssignments(assignments, now);
  if (pastDue.length === 0) return null;
  const grades = student?.grades || {};
  let sum = 0;
  for (const a of pastDue) {
    const id = Number(a.id);
    const key = Number.isFinite(id) ? id : a.id;
    const g = grades[key] ?? grades[String(key)];
    const val =
      g !== undefined && g !== null && !Number.isNaN(Number(g))
        ? Number(g)
        : 0;
    sum += val;
  }
  return sum / pastDue.length;
}

export function averagePercentPastDueAssignmentsRounded(
  student,
  assignments,
  now = new Date(),
  pastDueCached = null
) {
  const avg = averagePercentPastDueAssignments(student, assignments, now, pastDueCached);
  if (avg === null) return 0;
  return Math.round(avg);
}
