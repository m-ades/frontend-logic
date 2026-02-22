import { createContext, useContext, useReducer } from "react";
import { fetchJson, getStoredUser } from "../utils/api.js";
import { sortAssignmentsBySubchapter } from "../utils/assignmentSort.js";
import { isInstructorRole } from "../utils/auth.js";
import { parseDueDateAsEastern } from "../utils/easternTime.js";

// ============================================================================
// CONSTANTS
// ============================================================================

// Default grading scale
const DEFAULT_GRADING_SCALE = [
  { letter: "A", minPercent: 90, maxPercent: 100, color: "#10b981" },
  { letter: "B", minPercent: 80, maxPercent: 89, color: "#6366f1" },
  { letter: "C", minPercent: 70, maxPercent: 79, color: "#f59e0b" },
  { letter: "D", minPercent: 60, maxPercent: 69, color: "#f97316" },
  { letter: "F", minPercent: 0, maxPercent: 59, color: "#ef4444" },
];

// Default late policy
const DEFAULT_LATE_POLICY = {
  enabled: true,
  maxDaysLate: 7,
  penalty: 20, // Flat 20% penalty for late submissions
};

const COURSE_COLORS = [
  "#536DFE",
  "#16a34a",
  "#9333ea",
  "#f97316",
  "#db2777",
  "#0ea5e9",
];

const activeCourseStorageKey = (userId) => `logicapp_active_course_id_${userId || "anon"}`;

const readStoredActiveCourseId = (userId) => {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(activeCourseStorageKey(userId));
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch (error) {
    return null;
  }
};

const writeStoredActiveCourseId = (userId, courseId) => {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(activeCourseStorageKey(userId), String(courseId));
  } catch (error) {
    // ignore storage errors
  }
};

const EASTERN = "America/New_York";

const splitDateTime = (isoString) => {
  if (!isoString) return { date: null, time: null };
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return { date: null, time: null };
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = dateParts.find((p) => p.type === "year").value;
  const m = dateParts.find((p) => p.type === "month").value;
  const d = dateParts.find((p) => p.type === "day").value;
  const datePart = `${y}-${m}-${d}`;
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EASTERN,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = timeParts.find((p) => p.type === "hour").value;
  const minute = timeParts.find((p) => p.type === "minute").value;
  const timePart = `${hour}:${minute}`;
  return { date: datePart, time: timePart };
};

const mapCourseRecord = (course, index) => ({
  id: course.id,
  name: course.title,
  code: course.course_code,
  semester: course.semester,
  status: course.is_active ? "current" : "past",
  createdAt: course.created_at,
  studentCount: 0,
  color: COURSE_COLORS[index % COURSE_COLORS.length],
  latePolicy: DEFAULT_LATE_POLICY,
  gradingScale: DEFAULT_GRADING_SCALE,
});

const mapAssignmentRecord = (assignment) => {
  const dueAt = assignment.due_at ?? assignment.dueAt ?? assignment.due_date ?? null;
  const due = splitDateTime(dueAt);
  const publish = splitDateTime(assignment.created_at);
  const questionCount = Number(assignment.question_count) || 0;
  const derivedPoints = questionCount * 100;
  const totalPoints = Number.isFinite(Number(assignment.total_points))
    ? Number(assignment.total_points)
    : derivedPoints;

  return {
    id: assignment.id,
    courseId: assignment.course_id,
    name: assignment.title,
    description: assignment.description,
    kind: assignment.kind,
    chapter: assignment.chapter,
    subchapter: assignment.subchapter,
    publishDate: publish.date,
    publishTime: publish.time,
    dueAt,
    dueDate: due.date,
    dueTime: due.time,
    totalPoints,
    questionCount,
    lateWindowDays: assignment.late_window_days,
    latePenaltyPercent: assignment.late_penalty_percent,
    isPublished: !assignment.is_locked,
    isLocked: assignment.is_locked,
  };
};

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const CoursesStateContext = createContext();
const CoursesDispatchContext = createContext();

// ============================================================================
// API SERVICE LAYER
// ============================================================================

export async function fetchInstructorCourses() {
  const enrollments = await fetchJson("/api/course-enrollments");
  const courseIds = new Set((enrollments || []).map((item) => Number(item.course_id)));
  const courses = await fetchJson("/api/courses");

  return (courses || [])
    .filter((course) => courseIds.size === 0 || courseIds.has(Number(course.id)))
    .map((course, index) => mapCourseRecord(course, index));
}

const assignmentsListCache = new Map();

async function fetchCourseAssignmentsList(courseId) {
  const cached = getAssignmentsListCache(courseId);
  if (cached) {
    return cached;
  }
  const promise = fetchJson(`/api/courses/${courseId}/assignments`)
    .finally(() => {
      assignmentsListCache.delete(courseId);
    });
  assignmentsListCache.set(courseId, promise);
  return promise;
}

function getAssignmentsListCache(courseId) {
  if (!assignmentsListCache.has(courseId)) {
    return null;
  }
  return assignmentsListCache.get(courseId);
}

export async function fetchCourseAssignments(courseId) {
  const assignments = await fetchCourseAssignmentsList(courseId);
  const mapped = (assignments || [])
    .filter((assignment) => assignment.kind !== "practice")
    .map((assignment) => mapAssignmentRecord(assignment));
  return sortAssignmentsBySubchapter(mapped);
}

export async function fetchCoursePractices(courseId) {
  const assignments = await fetchCourseAssignmentsList(courseId);
  const mapped = (assignments || [])
    .filter((assignment) => assignment.kind === "practice")
    .map((assignment) => mapAssignmentRecord(assignment));
  return sortAssignmentsBySubchapter(mapped);
}

export async function fetchCourseAssignmentsAndPractices(courseId) {
  const assignments = await fetchCourseAssignmentsList(courseId);
  const mapped = (assignments || []).map((assignment) => mapAssignmentRecord(assignment));
  return {
    assignments: sortAssignmentsBySubchapter(
      mapped.filter((assignment) => assignment.kind !== "practice")
    ),
    practices: sortAssignmentsBySubchapter(
      mapped.filter((assignment) => assignment.kind === "practice")
    ),
  };
}

export async function fetchCourseGradebook(courseId) {
  const data = await fetchJson(`/api/analytics/gradebook?courseId=${courseId}`);
  const students = (data?.students || []).map((student) => {
    const grades = {};
    const submittedAssignments = {};
    (student.assignments || []).forEach((assignment) => {
      if (assignment.has_submission) {
        submittedAssignments[assignment.assignment_id] = true;
      }
      if (assignment.has_grade && assignment.max_score > 0) {
        grades[assignment.assignment_id] = Math.round(
          (assignment.final_score / assignment.max_score) * 100
        );
      }
    });

    const rawRole = student.role ?? "student";
    const role = String(rawRole).toLowerCase() === "ta" ? "ta" : "student";
    return {
      id: student.user_id,
      username: student.username,
      role,
      grades,
      submittedAssignments,
      lateSubmissions: {},
      submissionDates: {},
      practices: {},
    };
  });

  return students;
}

export async function updateEnrollmentRole(courseId, userId, role) {
  return fetchJson(
    `/api/instructor/courses/${courseId}/roster/${userId}/role`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }
  );
}

export async function updateCourse(courseId, updates) {
  const payload = {};
  if (updates.name || updates.title) payload.title = updates.name ?? updates.title;
  if (updates.code || updates.course_code) payload.course_code = updates.code ?? updates.course_code;
  if (updates.term || updates.semester) payload.semester = updates.term ?? updates.semester;
  if (typeof updates.is_active === "boolean") payload.is_active = updates.is_active;
  if (updates.status) payload.is_active = updates.status === "current";

  const updated = await fetchJson(`/api/courses/${courseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return mapCourseRecord(updated, Number(courseId) % COURSE_COLORS.length);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Average time to complete assignments - generates mock data
export function generateAvgTime(assignmentId) {
  const times = ["2.5 hrs", "3.2 hrs", "1.8 hrs", "4.1 hrs", "2.9 hrs"];
  const numericId = parseInt(String(assignmentId ?? "").replace(/\D/g, "")) || 0;
  return times[numericId % times.length];
}

// Calculate assignment average from gradebook
export function calculateAssignmentAverage(assignmentId, students) {
  const grades = students
    .map((student) => student.grades[assignmentId])
    .filter((grade) => grade !== undefined && grade !== null);

  if (grades.length === 0) return 0;
  return Math.round(
    grades.reduce((sum, grade) => sum + grade, 0) / grades.length
  );
}

// Calculate practice completion rate
export function calculatePracticeCompletion(practiceId, students) {
  const completions = students.filter(
    (student) => student.practices?.[practiceId]?.completed
  ).length;

  return {
    completions,
    attempts: students.reduce(
      (sum, student) => sum + (student.practices?.[practiceId]?.attempts || 0),
      0
    ),
  };
}

// Calculate grade distribution with custom grading scale
export function calculateGradeDistribution(students, gradingScale) {
  // Use default grading scale if none provided or if gradingScale is undefined
  const scale =
    gradingScale && Array.isArray(gradingScale)
      ? gradingScale
      : DEFAULT_GRADING_SCALE;

  const distribution = scale.map((grade) => ({
    grade: grade.letter,
    range: `${grade.minPercent}-${grade.maxPercent}`,
    count: 0,
    color: grade.color,
    minPercent: grade.minPercent,
    maxPercent: grade.maxPercent,
  }));

  students.forEach((student) => {
    const grades = Object.values(student.grades).filter(
      (g) => g !== undefined && g !== null
    );
    if (grades.length === 0) return;

    const average = Math.round(
      grades.reduce((sum, g) => sum + g, 0) / grades.length
    );

    const gradeIndex = distribution.findIndex(
      (d) => average >= d.minPercent && average <= d.maxPercent
    );

    if (gradeIndex !== -1) {
      distribution[gradeIndex].count++;
    }
  });

  return distribution;
}

// Calculate students at risk (below 70%)
export function getStudentsAtRisk(students, assignments) {
  return students
    .map((student) => {
      const grades = Object.values(student.grades).filter(
        (g) => g !== undefined && g !== null
      );
      const avg =
        grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
          : 0;
      const missing = assignments.length - grades.length;
      return { ...student, avg, missing };
    })
    .filter((s) => s.avg < 70 && s.avg > 0)
    .sort((a, b) => a.avg - b.avg);
}

// Get upcoming deadlines (within 7 days); due dates compared in Eastern
export function getUpcomingDeadlines(assignments) {
  const today = new Date();

  return assignments
    .map((a) => {
      const deadline = parseDueDateAsEastern(a.dueDate, a.dueTime || "23:59");
      const diffTime = deadline ? deadline - today : 0;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...a, daysLeft: diffDays };
    })
    .filter((a) => a.daysLeft >= 0 && a.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

// Helper function to calculate grade with flat late penalty
export function calculateGradeWithLatePenalty(earnedGrade, isLate, latePolicy) {
  // If late policy is not enabled or submission is not late, return original grade
  if (!latePolicy?.enabled || !isLate) {
    return earnedGrade;
  }

  // Apply flat penalty
  const penalizedGrade = earnedGrade - latePolicy.penalty;

  // Ensure grade doesn't go below 0
  return Math.max(0, penalizedGrade);
}

// Helper function to check if submission is late (due date interpreted in Eastern)
export function isSubmissionLate(submissionDate, dueDate, dueTime, latePolicy) {
  if (!latePolicy?.enabled) return false;

  const deadline = parseDueDateAsEastern(dueDate, dueTime || "23:59");
  if (!deadline) return false;

  const submission = new Date(submissionDate);

  // Check if late
  if (submission <= deadline) return false;

  // Check if within allowed late window
  const maxLateDate = new Date(deadline);
  maxLateDate.setDate(maxLateDate.getDate() + latePolicy.maxDaysLate);

  // If submitted beyond max late days, it should not be accepted (would be 0)
  if (submission > maxLateDate) return false;

  return true;
}

// ============================================================================
// REDUCER
// ============================================================================

const initialState = {
  courses: [],
  activeCourseId: null,
  assignmentsByCourse: {},
  practicesByCourse: {},
  gradebookByCourse: {},
  loading: false,
  error: null,
  initialized: false,
};

function coursesReducer(state, action) {
  switch (action.type) {
    case "RESET_COURSES_STATE":
      return { ...initialState };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };

    case "SET_ACTIVE_COURSE":
      return { ...state, activeCourseId: action.payload };

    case "SET_COURSES":
      return {
        ...state,
        courses: action.payload,
        loading: false,
        initialized: true,
      };

    case "SET_ASSIGNMENTS":
      return {
        ...state,
        assignmentsByCourse: {
          ...state.assignmentsByCourse,
          [action.courseId]: action.payload,
        },
      };

    case "SET_PRACTICES":
      return {
        ...state,
        practicesByCourse: {
          ...state.practicesByCourse,
          [action.courseId]: action.payload,
        },
      };

    case "SET_GRADEBOOK":
      return {
        ...state,
        gradebookByCourse: {
          ...state.gradebookByCourse,
          [action.courseId]: action.payload,
        },
      };
    case "ARCHIVE_COURSE":
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.courseId
            ? { ...course, status: action.archive ? "past" : "current" }
            : course
        ),
      };

    case "UPDATE_COURSE_NAME":
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.courseId
            ? { ...course, name: action.payload }
            : course
        ),
      };

    case "UPDATE_LATE_POLICY":
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.courseId
            ? { ...course, latePolicy: action.payload }
            : course
        ),
      };

    case "UPDATE_GRADING_SCALE":
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.courseId
            ? { ...course, gradingScale: action.payload }
            : course
        ),
      };

    case "UPDATE_COURSE_SETTINGS":
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.courseId
            ? { ...course, ...action.payload }
            : course
        ),
      };
    case "ADD_COURSE":
      return {
        ...state,
        courses: [...state.courses, action.payload],
        activeCourseId: action.payload.id,
      };

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function CoursesProvider({ children }) {
  const [state, dispatch] = useReducer(coursesReducer, initialState);

  return (
    <CoursesStateContext.Provider value={state}>
      <CoursesDispatchContext.Provider value={dispatch}>
        {children}
      </CoursesDispatchContext.Provider>
    </CoursesStateContext.Provider>
  );
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

export function useCoursesState() {
  const context = useContext(CoursesStateContext);
  if (!context) {
    throw new Error("useCoursesState must be used within CoursesProvider");
  }
  return context;
}

export function useCoursesDispatch() {
  const context = useContext(CoursesDispatchContext);
  if (!context) {
    throw new Error("useCoursesDispatch must be used within CoursesProvider");
  }
  return context;
}

// Hook to get active course data
export function useActiveCourse() {
  const {
    courses,
    activeCourseId,
    assignmentsByCourse,
    practicesByCourse,
    gradebookByCourse,
  } = useCoursesState();

  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const assignments = activeCourseId
    ? assignmentsByCourse[activeCourseId] || []
    : [];
  const practices = activeCourseId
    ? practicesByCourse[activeCourseId] || []
    : [];
  const gradebook = activeCourseId
    ? gradebookByCourse[activeCourseId] || []
    : [];

  return {
    course: activeCourse,
    assignments,
    practices,
    gradebook,
  };
}

// ============================================================================
// SYNCHRONOUS ACTION CREATORS
// ============================================================================

export function setActiveCourse(dispatch, courseId) {
  const storedUser = getStoredUser();
  writeStoredActiveCourseId(storedUser?.id, courseId);
  dispatch({ type: "SET_ACTIVE_COURSE", payload: courseId });
}

export function setCourses(dispatch, courses) {
  dispatch({ type: "SET_COURSES", payload: courses });
}

export function resetCourses(dispatch) {
  dispatch({ type: "RESET_COURSES_STATE" });
}

export function setAssignments(dispatch, courseId, assignments) {
  dispatch({ type: "SET_ASSIGNMENTS", courseId, payload: assignments });
}

export function setPractices(dispatch, courseId, practices) {
  dispatch({ type: "SET_PRACTICES", courseId, payload: practices });
}

export function setGradebook(dispatch, courseId, gradebook) {
  dispatch({ type: "SET_GRADEBOOK", courseId, payload: gradebook });
}

export function updateCourseName(dispatch, courseId, name) {
  dispatch({ type: "UPDATE_COURSE_NAME", courseId, payload: name });
}

export function updateLatePolicy(dispatch, courseId, latePolicy) {
  dispatch({ type: "UPDATE_LATE_POLICY", courseId, payload: latePolicy });
}

export function updateGradingScale(dispatch, courseId, gradingScale) {
  dispatch({ type: "UPDATE_GRADING_SCALE", courseId, payload: gradingScale });
}

export function updateCourseSettings(dispatch, courseId, settings) {
  dispatch({ type: "UPDATE_COURSE_SETTINGS", courseId, payload: settings });
}

// ============================================================================
// ASYNC ACTION CREATOR
// ============================================================================
// Archive or unarchive a course
export async function toggleArchiveCourse(dispatch, courseId, archive = true) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    await archiveCourse(courseId, archive);

    dispatch({
      type: "ARCHIVE_COURSE",
      courseId,
      archive,
    });

    dispatch({ type: "SET_LOADING", payload: false });
  } catch (error) {
    dispatch({ type: "SET_ERROR", payload: error.message });
    console.error(
      `Failed to ${archive ? "archive" : "unarchive"} course ${courseId}:`,
      error
    );
  }
}
// Create a new course
export async function addNewCourse(dispatch, courseData) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    const newCourse = await createCourse(courseData);

    // Add course to state (creator is always instructor)
    dispatch({ type: "ADD_COURSE", payload: { ...newCourse, role: "instructor" } });

    // Initialize empty data for the new course
    dispatch({ type: "SET_ASSIGNMENTS", courseId: newCourse.id, payload: [] });
    dispatch({ type: "SET_PRACTICES", courseId: newCourse.id, payload: [] });
    dispatch({ type: "SET_GRADEBOOK", courseId: newCourse.id, payload: [] });

    dispatch({ type: "SET_LOADING", payload: false });

    return newCourse;
  } catch (error) {
    dispatch({ type: "SET_ERROR", payload: error.message });
    console.error("Failed to create course:", error);
    throw error;
  }
}

// ============================================================================
// STUDENT MANAGEMENT API FUNCTIONS
// ============================================================================

export async function createStudent(courseId, studentData) {
  const payload = {
    username: studentData.username,
    password: studentData.password,
  };
  const response = await fetchJson(`/api/instructor/courses/${courseId}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    id: response?.user?.id,
    username: response?.user?.username,
    grades: {},
    lateSubmissions: {},
    submissionDates: {},
    practices: {},
  };
}

export async function bulkCreateStudents(courseId, students) {
  const payload = {
    students: students.map((student) => ({
      username: student.username,
      password: student.password,
    })),
  };
  return fetchJson(`/api/instructor/courses/${courseId}/students/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteStudent(courseId, studentId) {
  return fetchJson(`/api/instructor/courses/${courseId}/students/${studentId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// ASYNC ACTION CREATORS
// ============================================================================

// Initialize all courses and data
export async function initializeCourses(dispatch) {
  if (initializeCourses.inFlight) {
    return initializeCourses.inFlight;
  }

  initializeCourses.inFlight = (async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const courses = await fetchInstructorCourses();
      const storedUser = getStoredUser();
      const isInstructor = isInstructorRole(storedUser?.role);

      const myEnrollments = await fetchJson("/api/course-enrollments");
      const roleByCourseId = new Map(
        (myEnrollments || []).map((e) => [Number(e.course_id), e.role])
      );

      const coursesWithCounts = await Promise.all(
        courses.map(async (course) => {
          const role = roleByCourseId.get(course.id) ?? null;
          if (!isInstructor) {
            return { ...course, role };
          }
          try {
            const enrollments = await fetchJson(`/api/courses/${course.id}/enrollments`);
            const studentCount = (enrollments || []).filter(
              (enrollment) => enrollment.role === "student"
            ).length;
            return { ...course, studentCount, role };
          } catch (error) {
            return { ...course, role };
          }
        })
      );

      dispatch({ type: "SET_COURSES", payload: coursesWithCounts });

      // Set active course - prioritize last created course
      if (coursesWithCounts.length > 0) {
        const storedUser = getStoredUser();
        const storedActiveCourseId = readStoredActiveCourseId(storedUser?.id);
        const sortedCourses = [...coursesWithCounts].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          const idA = parseInt(a.id) || 0;
          const idB = parseInt(b.id) || 0;
          return idB - idA;
        });

        const storedCourse = storedActiveCourseId
          ? coursesWithCounts.find((course) => Number(course.id) === Number(storedActiveCourseId))
          : null;
        const mostRecentCourse = sortedCourses[0];
        const defaultCourse = storedCourse || mostRecentCourse;
        dispatch({ type: "SET_ACTIVE_COURSE", payload: defaultCourse.id });
        if (storedUser?.id && defaultCourse?.id) {
          writeStoredActiveCourseId(storedUser.id, defaultCourse.id);
        }

        // Load data for all courses in parallel
        await Promise.all(
          coursesWithCounts.map(async (course) => {
            const [assignmentData, gradebook] = await Promise.all([
              fetchCourseAssignmentsAndPractices(course.id),
              isInstructor ? fetchCourseGradebook(course.id) : Promise.resolve([]),
            ]);

            dispatch({
              type: "SET_ASSIGNMENTS",
              courseId: course.id,
              payload: assignmentData.assignments,
            });
            dispatch({
              type: "SET_PRACTICES",
              courseId: course.id,
              payload: assignmentData.practices,
            });
            dispatch({
              type: "SET_GRADEBOOK",
              courseId: course.id,
              payload: gradebook,
            });
          })
        );
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      console.error("Failed to initialize courses:", error);
    } finally {
      initializeCourses.inFlight = null;
    }
  })();

  return initializeCourses.inFlight;
}

// Load data for a specific course
export async function loadCourseData(dispatch, courseId) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    const storedUser = getStoredUser();
    const isInstructor = isInstructorRole(storedUser?.role);

    const [assignmentData, gradebook] = await Promise.all([
      fetchCourseAssignmentsAndPractices(courseId),
      isInstructor ? fetchCourseGradebook(courseId) : Promise.resolve([]),
    ]);

    dispatch({ type: "SET_ASSIGNMENTS", courseId, payload: assignmentData.assignments });
    dispatch({ type: "SET_PRACTICES", courseId, payload: assignmentData.practices });
    dispatch({ type: "SET_GRADEBOOK", courseId, payload: gradebook });
    dispatch({ type: "SET_LOADING", payload: false });
  } catch (error) {
    dispatch({ type: "SET_ERROR", payload: error.message });
    console.error(`Failed to load data for course ${courseId}:`, error);
  }
}

// Update course settings via API
export async function saveCourseSettings(dispatch, courseId, settings) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    await updateCourse(courseId, settings);
    dispatch({ type: "UPDATE_COURSE_SETTINGS", courseId, payload: settings });
    dispatch({ type: "SET_LOADING", payload: false });
  } catch (error) {
    dispatch({ type: "SET_ERROR", payload: error.message });
    console.error(`Failed to update course ${courseId}:`, error);
  }
}

// Add student to course
export async function addStudentToCourse(dispatch, courseId, studentData) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    const newStudent = await createStudent(courseId, studentData);

    const currentGradebook = await fetchCourseGradebook(courseId);
    const updatedGradebook = currentGradebook.some(
      (student) => student.id === newStudent.id
    )
      ? currentGradebook
      : [...currentGradebook, newStudent];

    dispatch({
      type: "SET_GRADEBOOK",
      courseId,
      payload: updatedGradebook,
    });

    // Update student count in course
    dispatch({
      type: "UPDATE_COURSE_SETTINGS",
      courseId,
      payload: { studentCount: updatedGradebook.length },
    });

    dispatch({ type: "SET_LOADING", payload: false });
  } catch (error) {
    dispatch({ type: "SET_ERROR", payload: error.message });
    console.error(`Failed to add student to course ${courseId}:`, error);
    throw error;
  }
}

// Remove student from course
export async function removeStudentFromCourse(dispatch, courseId, studentId) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    await deleteStudent(courseId, studentId);

    const currentGradebook = await fetchCourseGradebook(courseId);
    const updatedGradebook = currentGradebook.filter((s) => s.id !== studentId);

    dispatch({
      type: "SET_GRADEBOOK",
      courseId,
      payload: updatedGradebook,
    });

    // Update student count in course
    dispatch({
      type: "UPDATE_COURSE_SETTINGS",
      courseId,
      payload: { studentCount: updatedGradebook.length },
    });

    dispatch({ type: "SET_LOADING", payload: false });
  } catch (error) {
    dispatch({ type: "SET_ERROR", payload: error.message });
    console.error(`Failed to remove student from course ${courseId}:`, error);
  }
}

// Update student information
export async function updateStudentInCourse(
  dispatch,
  courseId,
  studentId,
  updates
) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    const currentGradebook = await fetchCourseGradebook(courseId);
    const updatedGradebook = currentGradebook.map((s) =>
      s.id === studentId ? { ...s, ...updates } : s
    );

    dispatch({
      type: "SET_GRADEBOOK",
      courseId,
      payload: updatedGradebook,
    });

    dispatch({ type: "SET_LOADING", payload: false });
  } catch (error) {
    dispatch({ type: "SET_ERROR", payload: error.message });
    console.error(`Failed to update student in course ${courseId}:`, error);
  }
}
// ============================================================================
// COURSE CREATION API FUNCTION
// ============================================================================

export async function createCourse(courseData) {
  const payload = {
    title: courseData.name ?? courseData.title,
    course_code: courseData.code ?? courseData.course_code,
    semester: courseData.term ?? courseData.semester,
    is_active: courseData.status ? courseData.status === "current" : true,
  };

  const created = await fetchJson("/api/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const mapped = mapCourseRecord(created, Number(created?.id ?? 0));
  return courseData.color ? { ...mapped, color: courseData.color } : mapped;
}

// ============================================================================
// ARCHIVE COURSE API FUNCTION
// ============================================================================

export async function archiveCourse(courseId, archive = true) {
  const updated = await updateCourse(courseId, {
    is_active: !archive,
  });

  return {
    id: updated.id,
    status: updated.status,
  };
}
