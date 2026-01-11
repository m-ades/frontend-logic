// utils/dateTimeUtils.js

/**
 * Formats a date string to a readable format
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {boolean} includeYear - Whether to include the year
 * @returns {string} Formatted date (e.g., "Jan 15" or "Jan 15, 2025")
 */
export function formatDate(dateString, includeYear = false) {
  if (!dateString) return "—";

  const date = new Date(dateString);
  const options = {
    month: "short",
    day: "numeric",
    ...(includeYear && { year: "numeric" }),
  };

  return date.toLocaleDateString("en-US", options);
}

/**
 * Formats a time string to 12-hour format
 * @param {string} timeString - Time in HH:mm format (24-hour)
 * @returns {string} Formatted time (e.g., "9:00 AM" or "11:59 PM")
 */
export function formatTime(timeString) {
  if (!timeString) return "";

  const [hours, minutes] = timeString.split(":");
  const date = new Date(2000, 0, 1, parseInt(hours), parseInt(minutes));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats date and time together
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:mm format (24-hour)
 * @param {Object} options - Formatting options
 * @param {boolean} options.short - Use short format (e.g., "Jan 15 at 9:00 AM")
 * @param {boolean} options.includeYear - Include year in date
 * @returns {string} Formatted date and time
 */
export function formatDateTime(dateString, timeString, options = {}) {
  const { short = true, includeYear = false } = options;

  if (!dateString) return "—";

  const date = new Date(dateString);
  const dateOptions = short
    ? { month: "short", day: "numeric" }
    : { month: "long", day: "numeric" };

  if (includeYear) {
    dateOptions.year = "numeric";
  }

  const dateFormatted = date.toLocaleDateString("en-US", dateOptions);

  if (!timeString) return dateFormatted;

  const timeFormatted = formatTime(timeString);

  return `${dateFormatted} at ${timeFormatted}`;
}

/**
 * Combines date and time strings into a Date object
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:mm format (24-hour)
 * @returns {Date} Combined Date object
 */
export function combineDateTimeToDate(dateString, timeString = "23:59") {
  if (!dateString) return new Date();

  const date = new Date(dateString);

  if (timeString) {
    const [hours, minutes] = timeString.split(":");
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  } else {
    // Default to end of day if no time specified
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

/**
 * Calculates days remaining until a deadline
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:mm format (24-hour)
 * @returns {number} Days remaining (can be negative if past due)
 */
export function getDaysUntilDeadline(dateString, timeString) {
  const deadline = combineDateTimeToDate(dateString, timeString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Checks if a deadline has passed
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:mm format (24-hour)
 * @returns {boolean} True if deadline has passed
 */
export function isPastDeadline(dateString, timeString) {
  const deadline = combineDateTimeToDate(dateString, timeString);
  return new Date() > deadline;
}

/**
 * Gets the current date in YYYY-MM-DD format
 * @returns {string} Current date
 */
export function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gets the current time in HH:mm format
 * @returns {string} Current time
 */
export function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats a relative time description (e.g., "Due today", "Due in 3 days")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:mm format (24-hour)
 * @returns {string} Relative time description
 */
export function getRelativeDeadline(dateString, timeString) {
  const daysLeft = getDaysUntilDeadline(dateString, timeString);

  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)} day${
      Math.abs(daysLeft) === 1 ? "" : "s"
    } overdue`;
  }
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  if (daysLeft <= 7) return `Due in ${daysLeft} days`;

  return formatDateTime(dateString, timeString);
}

/**
 * Creates initial form data for date/time inputs with default values
 * @param {Object} existingData - Existing assignment data (optional)
 * @returns {Object} Form data with date and time fields
 */
export function initializeAssignmentFormData(existingData = {}) {
  return {
    name: existingData.name || "",
    totalPoints: existingData.totalPoints || 100,
    publishDate: existingData.publishDate || getCurrentDate(),
    publishTime: existingData.publishTime || "00:00",
    dueDate: existingData.dueDate || getCurrentDate(),
    dueTime: existingData.dueTime || "23:59",
    isPublished: existingData.isPublished ?? false,
    isLocked: existingData.isLocked ?? false,
    allowRetakes: existingData.allowRetakes ?? false,
    showSolutions: existingData.showSolutions ?? false,
  };
}
