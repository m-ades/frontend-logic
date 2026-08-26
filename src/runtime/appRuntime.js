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

const toIsoDateTime = (date, time) => {
  if (!date) return null;
  const safeTime = time || "00:00";
  return new Date(`${date}T${safeTime}:00`).toISOString();
};

const buildAssignmentPayload = (formData, courseId, overrides = {}) => {
  const dueDate = toIsoDateTime(formData.dueDate, formData.dueTime || "23:59");
  return {
    course_id: courseId,
    kind: "assignment",
    title: formData.name,
    description: formData.description || null,
    is_locked: formData.isLocked,
    chapter: Number(formData.chapter) || 1,
    subchapter: formData.subchapter || "",
    due_date: dueDate,
    ...overrides,
  };
};

const buildPracticePayload = (formData, courseId, overrides = {}) => ({
  course_id: courseId,
  kind: "practice",
  title: formData.name,
  description: formData.description || null,
  is_locked: formData.isLocked,
  chapter: Number(formData.chapter) || 1,
  subchapter: formData.subchapter || "A",
  due_date: null,
  late_window_days: null,
  late_penalty_percent: null,
  ...overrides,
});

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
      const nextPublished = !assignment.isPublished;
      await fetchJson(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: assignment.isLocked || !nextPublished }),
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
      const nextPublished = !practice.isPublished;
      await fetchJson(`/api/assignments/${practiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: practice.isLocked || !nextPublished }),
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
    getAssignmentSubmissions: async (assignmentId) => {
      const id = Number(assignmentId);
      if (!Number.isInteger(id) || id <= 0) return [];
      const rows = await fetchJson(`/api/instructor/assignments/${id}/submissions`);
      return Array.isArray(rows) ? rows : [];
    },
    loadInstructorDashboard: async (courseId) => {
      const [analytics, summary] = await Promise.all([
        fetchJson(`/api/analytics/instructor-dashboard?courseId=${courseId}`),
        fetchJson(`/api/analytics/gradebook-summary?courseId=${courseId}`),
      ]);
      return {
        analytics,
        gradebookSummary: Array.isArray(summary) ? summary : (summary?.assignments ?? []),
      };
    },
  };

  return {
    mode: "app",
    ...runtimePaths,
    isSandbox: false,
    remapStudentPath: (path) => remapStudentPath(path, runtimePaths.routePrefix),
    getBreadcrumbInfo: (pathname) => buildBreadcrumbInfo(pathname, {
      routeKind,
      routePrefix: runtimePaths.routePrefix,
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
