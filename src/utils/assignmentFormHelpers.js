export const getCurrentDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
export const getCurrentTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });

export function getInitialAssignmentFormData(type = "assignment") {
  const isPractice = type === "practice";
  return {
    name: "",
    totalPoints: isPractice ? 0 : 100,
    publishDate: getCurrentDate(),
    publishTime: "00:00",
    dueDate: getCurrentDate(),
    dueTime: "23:59",
    isPublished: false,
    isLocked: false,
    allowRetakes: isPractice,
    showSolutions: false,
  };
}

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
    allowRetakes: assignment.allowRetakes ?? isPractice,
    showSolutions: assignment.showSolutions ?? false,
  };
}

export function validateAssignmentForm(formData, type = "assignment") {
  const errors = [];
  const isPractice = type === "practice";

  if (!formData.name?.trim()) errors.push("Assignment name is required");
  if (!isPractice && (!formData.totalPoints || formData.totalPoints <= 0)) {
    errors.push("Total points must be greater than 0");
  }
  if (!formData.publishDate) errors.push("Publish date is required");
  if (!formData.publishTime) errors.push("Publish time is required");
  if (!isPractice && !formData.dueDate) errors.push("Due date is required");
  if (!isPractice && !formData.dueTime) errors.push("Due time is required");

  if (formData.publishDate && formData.dueDate) {
    const pub = new Date(`${formData.publishDate}T${formData.publishTime || "00:00"}`);
    const due = new Date(`${formData.dueDate}T${formData.dueTime || "23:59"}`);
    if (due < pub) errors.push("Due date/time cannot be before publish date/time");
  }

  return { isValid: errors.length === 0, errors };
}
