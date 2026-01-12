/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in HH:mm format
 */
export function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Initialize form data for creating a new assignment
 * @param {string} type - "assignment" or "practice"
 * @returns {Object} Initial form data with all required fields
 */
export function getInitialAssignmentFormData(type = "assignment") {
  const isPractice = type === "practice";

  return {
    name: "",
    totalPoints: isPractice ? 0 : 100,
    publishDate: getCurrentDate(),
    publishTime: "00:00", // Midnight
    dueDate: getCurrentDate(),
    dueTime: "23:59", // End of day
    isPublished: false,
    isLocked: false,
    allowRetakes: isPractice ? true : false,
    showSolutions: isPractice ? false : false,
  };
}

/**
 * Initialize form data for editing an existing assignment
 * @param {Object} assignment - Existing assignment object
 * @param {string} type - "assignment" or "practice"
 * @returns {Object} Form data populated from existing assignment
 */
export function getEditAssignmentFormData(assignment, type = "assignment") {
  const isPractice = type === "practice";

  return {
    name: assignment.name || "",
    totalPoints: assignment.totalPoints || (isPractice ? 0 : 100),
    publishDate: assignment.publishDate || getCurrentDate(),
    publishTime: assignment.publishTime || "00:00",
    dueDate: assignment.dueDate || getCurrentDate(),
    dueTime: assignment.dueTime || "23:59",
    isPublished: assignment.isPublished ?? false,
    isLocked: assignment.isLocked ?? false,
    allowRetakes: assignment.allowRetakes ?? (isPractice ? true : false),
    showSolutions: assignment.showSolutions ?? (isPractice ? false : false),
  };
}

/**
 * Validate assignment form data
 * @param {Object} formData - Form data to validate
 * @param {string} type - "assignment" or "practice"
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateAssignmentForm(formData, type = "assignment") {
  const errors = [];
  const isPractice = type === "practice";

  // Check required fields
  if (!formData.name || formData.name.trim() === "") {
    errors.push("Assignment name is required");
  }

  if (!isPractice) {
    if (!formData.totalPoints || formData.totalPoints <= 0) {
      errors.push("Total points must be greater than 0");
    }
  }

  if (!formData.publishDate) {
    errors.push("Publish date is required");
  }

  if (!formData.publishTime) {
    errors.push("Publish time is required");
  }

  if (!isPractice) {
    if (!formData.dueDate) {
      errors.push("Due date is required");
    }

    if (!formData.dueTime) {
      errors.push("Due time is required");
    }
  }

  // Validate dates
  if (formData.publishDate && formData.dueDate) {
    const publishDateTime = new Date(
      `${formData.publishDate}T${formData.publishTime || "00:00"}`
    );
    const dueDateTime = new Date(
      `${formData.dueDate}T${formData.dueTime || "23:59"}`
    );

    if (dueDateTime < publishDateTime) {
      errors.push("Due date/time cannot be before publish date/time");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
