import { getGradeColor, getLetterGrade } from "../../../utils/gradingUtils";
import { parseDueDateAsEastern } from "../../../utils/easternTime.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const statusByState = {
  before: {
    complete: "completed",
    partial: "inProgress",
    none: "notStarted",
  },
  grace: {
    complete: "completed",
    partial: "incomplete",
    none: "missing",
  },
  after: {
    complete: "completed",
    partial: "incomplete",
    none: "missing",
  },
};

export function calculateTrend(grades, assignments) {
  if (assignments.length < 3) return null;

  const recentAssignments = assignments.slice(-3);
  const recentGrades = recentAssignments
    .map((a) => grades[a.id])
    .filter((g) => g !== undefined);

  if (recentGrades.length < 2) return null;

  const firstHalf = recentGrades.slice(0, Math.ceil(recentGrades.length / 2));
  const secondHalf = recentGrades.slice(Math.ceil(recentGrades.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "improving" : "declining";
}

export const getGradeMeta = (grade, gradingScale) => {
  const color = getGradeColor(grade, gradingScale);
  return {
    letter: getLetterGrade(grade, gradingScale),
    chipColor: color === "default" ? "default" : undefined,
    chipSx: color && color !== "default" ? { bgcolor: color, color: "common.white" } : {},
    textColor: color === "default" ? "text.primary" : color,
  };
};

// student deadlines override the assignment due and cutoff when an extension or accommodation exists
export function getAssignmentStatus(assignment, student, deadlineMap) {
  if (assignment.is_locked === true || assignment.isLocked === true) return "notReleased";

  const submitted = Number(student.submittedQuestionCounts?.[assignment.id] || 0);
  const total = Number(assignment.questionCount || assignment.question_count || 0);
  const submission =
    total > 0 && submitted >= total
      ? "complete"
      : submitted > 0
      ? "partial"
      : "none";
  const dueAt = deadlineMap?.[assignment.id]?.due_at
    ? new Date(deadlineMap[assignment.id].due_at)
    : assignment.dueAt
    ? new Date(assignment.dueAt)
    : parseDueDateAsEastern(assignment.dueDate, assignment.dueTime || "23:59");
  const lateDays = Number(assignment.lateWindowDays || assignment.late_window_days || 0);
  const cutoffAt = deadlineMap?.[assignment.id]?.cutoff_at
    ? new Date(deadlineMap[assignment.id].cutoff_at)
    : dueAt && lateDays > 0
    ? new Date(dueAt.getTime() + lateDays * DAY_MS)
    : dueAt;
  const now = new Date();
  const time =
    !dueAt || now <= dueAt ? "before" : !cutoffAt || now <= cutoffAt ? "grace" : "after";

  return statusByState[time][submission];
}
