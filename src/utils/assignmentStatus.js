import { parseDueDateAsEastern } from "./easternTime.js";

/**
 * Get status color for an assignment or practice
 * Due dates are compared in Eastern time so Feb 1 means end of Feb 1 Eastern.
 */
export function getStatusColor(item, isPractice = false) {
  const now = new Date();
  const dueDate = item.dueDate ? parseDueDateAsEastern(item.dueDate, item.dueTime) : null;
  const publishDate = item.publishDate ? new Date(item.publishDate) : null;

  if (item.isLocked) return "default";
  if (!item.isPublished) return "warning";
  if (dueDate && dueDate < now) return isPractice ? "info" : "error";
  return "success";
}

/**
 * Get status text for an assignment or practice
 * Due dates are compared in Eastern time.
 */
export function getStatusText(item, isPractice = false) {
  const now = new Date();
  const dueDate = item.dueDate ? parseDueDateAsEastern(item.dueDate, item.dueTime) : null;
  const publishDate = item.publishDate ? new Date(item.publishDate) : null;

  if (item.isLocked) return "Locked";
  if (!item.isPublished) return "Draft";
  if (publishDate && publishDate > now) return "Active";
  if (dueDate && dueDate < now) return isPractice ? "Available" : "Past Due";
  return "Active";
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
      ...item,
      totalStudents,
      isPublished: item.isPublished ?? true,
      isLocked: item.isLocked ?? false,
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
