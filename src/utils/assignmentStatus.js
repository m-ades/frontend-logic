import { parseDueDateAsEastern } from "./easternTime.js";
import { projectPublicationState } from "./publicationPolicy.js";

/**
 * Get status color for an assignment or practice
 * Due dates are compared in Eastern time so Feb 1 means end of Feb 1 Eastern.
 */
export function getStatusColor(item, isPractice = false) {
  const now = new Date();
  const publication = projectPublicationState(item, now);
  const dueDate = item.dueDate ? parseDueDateAsEastern(item.dueDate, item.dueTime) : null;

  if (publication.isLocked && publication.publishAt) return "info";
  if (publication.isLocked) return "default";
  if (dueDate && dueDate < now) return isPractice ? "info" : "error";
  return "success";
}

/**
 * Get status text for an assignment or practice
 * Due dates are compared in Eastern time.
 */
export function getStatusText(item, isPractice = false) {
  const now = new Date();
  const publication = projectPublicationState(item, now);
  const dueDate = item.dueDate ? parseDueDateAsEastern(item.dueDate, item.dueTime) : null;

  if (publication.isLocked && publication.publishAt) return "Scheduled";
  if (publication.isLocked) return "Locked";
  if (dueDate && dueDate < now) return isPractice ? "Available" : "Past Due";
  return "Active";
}

// the student upcoming tab, unlocked unfinished work due within two weeks, soonest first
export function getUpcomingAssignments(assignments) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const twoWeeksOut = new Date(startOfDay);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  return assignments
    .map((assignment) => ({
      assignment,
      deadline: parseDueDateAsEastern(assignment.due_at ?? assignment.due_date),
    }))
    .filter(({ assignment, deadline }) => (
      assignment.kind !== "practice"
      && !assignment.is_locked
      && !assignment.completed
      && deadline
      && deadline >= startOfDay
      && deadline <= twoWeeksOut
    ))
    .sort((a, b) => a.deadline - b.deadline)
    .map(({ assignment }) => assignment);
}

/**
 * Enhance items with calculated data
 * @param {Array} items - Array of assignments or practices
 * @param {Object} activeCourse - Active course object
 * @param {Array} gradebook - Gradebook data (for assignments only)
 * @param {boolean} isPractice - Whether these are practice assignments
 * @returns {Array} - Enhanced items
 */
export function enhanceItems(
  items,
  activeCourse,
  gradebook = [],
  isPractice = false
) {
  return items.map((item) => {
    const totalStudents = activeCourse?.studentCount || 0;

    const enhanced = {
      ...projectPublicationState(item),
      totalStudents,
      publishDate: item.publishDate || null,
    };

    if (isPractice) {
      enhanced.attempts = item.attempts || 0;
      enhanced.completions = item.completions || 0;
      enhanced.allowRetakes = item.allowRetakes ?? true;
      enhanced.showSolutions = item.showSolutions ?? true;
    } else {
      enhanced.totalPoints = item.totalPoints || 100;
    }

    return enhanced;
  });
}
