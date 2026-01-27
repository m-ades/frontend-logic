// All dates are Eastern Time (America/New_York)

// Format YYYY-MM-DD to readable date
export function formatDate(dateString, includeYear = false) {
  if (!dateString) return "—";
  const [y, m, d] = dateString.split('-').map(Number);
  if (!y || !m || !d) return "—";
  const date = new Date(y, m - 1, d, 12);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear && { year: "numeric" }),
  });
}

// Format HH:mm to 12-hour time
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

// Format date and time together
export function formatDateTime(dateString, timeString, options = {}) {
  const { includeYear = false } = options;
  if (!dateString) return "—";
  const dateFormatted = formatDate(dateString, includeYear);
  if (!timeString) return dateFormatted;
  return `${dateFormatted} at ${formatTime(timeString)}`;
}

// Combine date/time strings into Date object
export function combineDateTimeToDate(dateString, timeString = "23:59") {
  if (!dateString) return new Date();
  const [y, m, d] = dateString.split('-').map(Number);
  const [h, min] = (timeString || "23:59").split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0);
}

// Days until deadline
export function getDaysUntilDeadline(dateString, timeString) {
  const deadline = combineDateTimeToDate(dateString, timeString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

// Check if deadline passed
export function isPastDeadline(dateString, timeString) {
  return new Date() > combineDateTimeToDate(dateString, timeString);
}

// Current date/time in Eastern
export function getCurrentDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function getCurrentTime() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
}

// Relative deadline text
export function getRelativeDeadline(dateString, timeString) {
  const daysLeft = getDaysUntilDeadline(dateString, timeString);
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  if (daysLeft <= 7) return `Due in ${daysLeft} days`;
  return formatDateTime(dateString, timeString);
}
