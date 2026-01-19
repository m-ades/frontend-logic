/**
 * Get status color for an assignment or practice
 * @param {Object} item - Assignment or practice object
 * @param {boolean} isPractice - Whether this is a practice assignment
 * @returns {string} - MUI color name
 */
export function getStatusColor(item, isPractice = false) {
  const now = new Date();
  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
  const publishDate = item.publishDate ? new Date(item.publishDate) : null;

  if (item.isLocked) return "default";
  if (!item.isPublished || (publishDate && publishDate > now)) return "warning";
  if (dueDate && dueDate < now) return isPractice ? "info" : "error";
  return "success";
}

/**
 * Get status text for an assignment or practice
 * @param {Object} item - Assignment or practice object
 * @param {boolean} isPractice - Whether this is a practice assignment
 * @returns {string} - Status text
 */
export function getStatusText(item, isPractice = false) {
  const now = new Date();
  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
  const publishDate = item.publishDate ? new Date(item.publishDate) : null;

  if (item.isLocked) return "Locked";
  if (!item.isPublished) return "Draft";
  if (publishDate && publishDate > now) return "Scheduled";
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
      publishDate: item.publishDate || item.dueDate,
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
