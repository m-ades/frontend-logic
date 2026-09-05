import {
  addNewCourse,
  addStudentToCourse,
  bulkCreateStudents,
  fetchCourseAssignments,
  fetchCoursePractices,
  initializeCourses,
  removeStudentFromCourse,
  resetCourses,
  saveCourseSettings,
  setActiveCourse,
  toggleArchiveCourse,
  updateEnrollmentRole,
} from "../context/CoursesContext.jsx";
import { fetchJson } from "../utils/api.js";
import { buildBreadcrumbInfo, buildRuntimePaths, remapStudentPath } from "./sandboxRuntime.js";
import { toEasternIso } from "../utils/easternTime.js";
import { buildPublicationPayload } from "../utils/publicationPolicy.js";

// converts form dates in new york and throws for invalid wall times
const toIsoDateTime = (date, time) => {
  if (!date) return null;
  const value = toEasternIso(date, time || "00:00");
  if (!value) throw new Error("choose a valid new york time");
  return value;
};

const buildAssignmentPayload = (formData, courseId, overrides = {}) => {
  const dueDate = toIsoDateTime(formData.dueDate, formData.dueTime || "23:59");
  const publication = buildPublicationPayload(formData);
  if (!publication) throw new Error("choose a valid new york publish time");
  return {
    course_id: courseId,
    kind: "assignment",
    title: formData.name,
    description: formData.description || null,
    ...publication,
    group_questions_by_type: Boolean(formData.groupQuestionsByType),
    chapter: Number(formData.chapter) || 1,
    subchapter: formData.subchapter || "",
    due_date: dueDate,
    ...overrides,
  };
};

const buildPracticePayload = (formData, courseId, overrides = {}) => {
  const publication = buildPublicationPayload(formData);
  if (!publication) throw new Error("choose a valid new york publish time");
  return {
    course_id: courseId,
    kind: "practice",
    title: formData.name,
    description: formData.description || null,
    ...publication,
    group_questions_by_type: Boolean(formData.groupQuestionsByType),
    chapter: Number(formData.chapter) || 1,
    subchapter: formData.subchapter || "A",
    due_date: null,
    late_window_days: null,
    late_penalty_percent: null,
    ...overrides,
  };
};

export function createAppRuntime({ coursesDispatch, coursesState, routeKind, user }) {
  const runtimePaths = buildRuntimePaths(routeKind);
  const runtimeCourseActions = {
    initializeCourses: async () => initializeCourses(coursesDispatch),
    setActiveCourse: (courseId) => setActiveCourse(coursesDispatch, courseId),
    resetCourses: () => resetCourses(coursesDispatch),
    addNewCourse: async (courseData) => addNewCourse(coursesDispatch, courseData),
    setAssignments: (courseId, payload) => coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload }),
    setPractices: (courseId, payload) => coursesDispatch({ type: "SET_PRACTICES", courseId, payload }),
    setGradebook: (courseId, payload) => coursesDispatch({ type: "SET_GRADEBOOK", courseId, payload }),
    updateCourseSettings: (courseId, payload) =>
      coursesDispatch({ type: "UPDATE_COURSE_SETTINGS", courseId, payload }),
    saveCourseSettings: async (courseId, settings) => saveCourseSettings(coursesDispatch, courseId, settings),
    toggleArchiveCourse: async (courseId, archive = true) => toggleArchiveCourse(coursesDispatch, courseId, archive),
    addStudentToCourse: async (courseId, studentData) => addStudentToCourse(coursesDispatch, courseId, studentData),
    removeStudentFromCourse: async (courseId, studentId) => removeStudentFromCourse(coursesDispatch, courseId, studentId),
    createAssignment: async (courseId, formData) => {
      const created = await fetchJson("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAssignmentPayload(formData, courseId)),
      });
      const refreshed = await fetchCourseAssignments(courseId);
      coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload: refreshed });
      return created;
    },
    updateAssignment: async (courseId, assignmentId, formData) => {
      await fetchJson(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAssignmentPayload(formData, courseId)),
      });
      const refreshed = await fetchCourseAssignments(courseId);
      coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload: refreshed });
    },
    toggleAssignmentLock: async (courseId, assignmentId, assignment) => {
      await fetchJson(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: !assignment.isLocked }),
      });
      const refreshed = await fetchCourseAssignments(courseId);
      coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload: refreshed });
    },
    toggleAssignmentPublish: async (courseId, assignmentId, assignment) => {
      await fetchJson(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: Boolean(assignment.isPublished) }),
      });
      const refreshed = await fetchCourseAssignments(courseId);
      coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload: refreshed });
    },
    duplicateAssignment: async (courseId, assignment) => {
      await fetchJson("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          kind: "assignment",
          title: `${assignment.name} (Copy)`,
          description: assignment.description || null,
          is_locked: true,
          group_questions_by_type: Boolean(assignment.groupQuestionsByType),
          chapter: assignment.chapter || 1,
          subchapter: assignment.subchapter || "",
          due_date: assignment.dueDate
            ? toIsoDateTime(assignment.dueDate, assignment.dueTime || "23:59")
            : null,
          late_window_days: assignment.lateWindowDays,
          late_penalty_percent: assignment.latePenaltyPercent,
        }),
      });
      const refreshed = await fetchCourseAssignments(courseId);
      coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload: refreshed });
    },
    deleteAssignment: async (courseId, assignmentId) => {
      await fetchJson(`/api/assignments/${assignmentId}`, { method: "DELETE" });
      const refreshed = await fetchCourseAssignments(courseId);
      coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload: refreshed });
    },
    updateAssignmentDueDate: async (courseId, assignmentId, dueDate, dueTime) => {
      await fetchJson(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date: toIsoDateTime(dueDate, dueTime || "23:59") }),
      });
      const refreshed = await fetchCourseAssignments(courseId);
      coursesDispatch({ type: "SET_ASSIGNMENTS", courseId, payload: refreshed });
    },
    createPractice: async (courseId, formData) => {
      const created = await fetchJson("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPracticePayload(formData, courseId)),
      });
      const refreshed = await fetchCoursePractices(courseId);
      coursesDispatch({ type: "SET_PRACTICES", courseId, payload: refreshed });
      return created;
    },
    updatePractice: async (courseId, practiceId, formData) => {
      await fetchJson(`/api/assignments/${practiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPracticePayload(formData, courseId)),
      });
      const refreshed = await fetchCoursePractices(courseId);
      coursesDispatch({ type: "SET_PRACTICES", courseId, payload: refreshed });
    },
    togglePracticeLock: async (courseId, practiceId, practice) => {
      await fetchJson(`/api/assignments/${practiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: !practice.isLocked }),
      });
      const refreshed = await fetchCoursePractices(courseId);
      coursesDispatch({ type: "SET_PRACTICES", courseId, payload: refreshed });
    },
    togglePracticePublish: async (courseId, practiceId, practice) => {
      await fetchJson(`/api/assignments/${practiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: Boolean(practice.isPublished) }),
      });
      const refreshed = await fetchCoursePractices(courseId);
      coursesDispatch({ type: "SET_PRACTICES", courseId, payload: refreshed });
    },
    duplicatePractice: async (courseId, practice) => {
      await fetchJson("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          kind: "practice",
          title: `${practice.name} (Copy)`,
          description: practice.description || null,
          is_locked: true,
          group_questions_by_type: Boolean(practice.groupQuestionsByType),
          chapter: practice.chapter || 1,
          subchapter: practice.subchapter || "A",
          due_date: null,
          late_window_days: null,
          late_penalty_percent: null,
        }),
      });
      const refreshed = await fetchCoursePractices(courseId);
      coursesDispatch({ type: "SET_PRACTICES", courseId, payload: refreshed });
    },
    deletePractice: async (courseId, practiceId) => {
      await fetchJson(`/api/assignments/${practiceId}`, { method: "DELETE" });
      const refreshed = await fetchCoursePractices(courseId);
      coursesDispatch({ type: "SET_PRACTICES", courseId, payload: refreshed });
    },
    bulkAddStudents: async (courseId, students, existingStudents = []) => {
      const response = await bulkCreateStudents(courseId, students);
      const imported = response?.students || [];
      const newStudents = imported.map((student) => ({
        id: student.id,
        username: student.username,
        grades: {},
        lateSubmissions: {},
        submissionDates: {},
        practices: {},
      }));
      const updatedGradebook = [...existingStudents, ...newStudents];
      coursesDispatch({ type: "SET_GRADEBOOK", courseId, payload: updatedGradebook });
      coursesDispatch({
        type: "UPDATE_COURSE_SETTINGS",
        courseId,
        payload: { studentCount: updatedGradebook.length },
      });
      return newStudents;
    },
    updateStudentRole: async (courseId, userId, role, existingStudents = []) => {
      const normalizedRole = String(role).toLowerCase() === "ta" ? "ta" : "student";
      await updateEnrollmentRole(courseId, userId, normalizedRole);
      const updated = existingStudents.map((student) =>
        student.id === userId ? { ...student, role: normalizedRole } : student
      );
      coursesDispatch({ type: "SET_GRADEBOOK", courseId, payload: updated });
      return updated;
    },
    getAccommodations: async (courseId, userId) => {
      const rows = await fetchJson(`/api/instructor/courses/${Number(courseId)}/accommodations`);
      return (rows || []).filter((row) => row.user_id === userId);
    },
    saveAccommodations: async (courseId, userId, payload) => {
      await fetchJson(`/api/instructor/courses/${Number(courseId)}/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, user_id: userId }),
      });
    },
    getDeadlines: async (courseId, userId) => {
      return fetchJson(`/api/instructor/courses/${Number(courseId)}/deadlines/${userId}`);
    },
    saveDeadline: async (courseId, assignmentId, userId, extensionDueAt) => {
      await fetchJson(`/api/instructor/assignments/${assignmentId}/extensions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          extended_due_date: extensionDueAt,
        }),
      });
    },
    /**
     * loads instructor analytics while preserving an explicit empty class average
     */
    loadInstructorDashboard: async (courseId) => {
      const [analytics, summary] = await Promise.all([
        fetchJson(`/api/analytics/instructor-dashboard?courseId=${courseId}`),
        fetchJson(`/api/analytics/gradebook-summary?courseId=${courseId}`),
      ]);
      const hasClassAverage =
        !Array.isArray(summary) &&
        summary != null &&
        Object.hasOwn(summary, "class_avg_with_drop");
      return {
        analytics,
        gradebookSummary: Array.isArray(summary) ? summary : (summary?.assignments ?? []),
        classAverageWithDrop: hasClassAverage
          ? summary.class_avg_with_drop
          : undefined,
      };
    },
  };

  return {
    mode: "app",
    ...runtimePaths,
    isSandbox: false,
    remapStudentPath: (path) => remapStudentPath(path, runtimePaths.routePrefix),
    getBreadcrumbInfo: (pathname, returnTo) => buildBreadcrumbInfo(pathname, {
      routeKind,
      routePrefix: runtimePaths.routePrefix,
      returnTo,
    }),
    storageScope: "local",
    user,
    courses: coursesState.courses,
    activeCourseId: coursesState.activeCourseId,
    sandbox: null,
    instructorSandbox: null,
    courseState: coursesState,
    courseActions: runtimeCourseActions,
  };
}
