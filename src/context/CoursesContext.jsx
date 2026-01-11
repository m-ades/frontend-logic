import { createContext, useContext, useReducer, useEffect } from "react";
import {
  MOCK_INSTRUCTOR_COURSES,
  MOCK_ASSIGNMENTS_BY_COURSE,
  MOCK_GRADEBOOK_BY_COURSE,
  MOCK_PRACTICES_BY_COURSE,
} from "./mockData/courses";

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

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const CoursesStateContext = createContext();
const CoursesDispatchContext = createContext();

// ============================================================================
// API SERVICE LAYER
// Replace these functions with actual API calls when backend is ready
// ============================================================================

// Simulates: GET /api/instructor/courses
export async function fetchInstructorCourses() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_INSTRUCTOR_COURSES), 100);
  });
}

// Simulates: GET /api/courses/:courseId/assignments
export async function fetchCourseAssignments(courseId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_ASSIGNMENTS_BY_COURSE[courseId] || []), 100);
  });
}

// Simulates: GET /api/courses/:courseId/practices
export async function fetchCoursePractices(courseId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_PRACTICES_BY_COURSE[courseId] || []), 100);
  });
}

// Simulates: GET /api/courses/:courseId/gradebook
export async function fetchCourseGradebook(courseId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_GRADEBOOK_BY_COURSE[courseId] || []), 100);
  });
}

// Simulates: PATCH /api/courses/:courseId
export async function updateCourse(courseId, updates) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...updates, id: courseId }), 100);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Average time to complete assignments - generates mock data
export function generateAvgTime(assignmentId) {
  const times = ["2.5 hrs", "3.2 hrs", "1.8 hrs", "4.1 hrs", "2.9 hrs"];
  return times[parseInt(assignmentId.replace(/\D/g, "")) % times.length];
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

// Get upcoming deadlines (within 7 days)
export function getUpcomingDeadlines(assignments) {
  const today = new Date();

  return assignments
    .map((a) => {
      const dueDate = new Date(a.dueDate);

      // If time is specified, set it
      if (a.dueTime) {
        const [hours, minutes] = a.dueTime.split(":");
        dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        // Default to end of day if no time
        dueDate.setHours(23, 59, 59, 999);
      }

      const diffTime = dueDate - today;
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

// Helper function to check if submission is late
export function isSubmissionLate(submissionDate, dueDate, dueTime, latePolicy) {
  if (!latePolicy?.enabled) return false;

  const deadline = new Date(dueDate);
  if (dueTime) {
    const [hours, minutes] = dueTime.split(":");
    deadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  } else {
    deadline.setHours(23, 59, 59, 999);
  }

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
  dispatch({ type: "SET_ACTIVE_COURSE", payload: courseId });
}

export function setCourses(dispatch, courses) {
  dispatch({ type: "SET_COURSES", payload: courses });
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
// STUDENT MANAGEMENT API FUNCTIONS
// ============================================================================

// Simulates: POST /api/courses/:courseId/students
export async function createStudent(courseId, studentData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newStudent = {
        id: `s${Date.now()}`,
        name: studentData.name,
        email: studentData.email,
        // Password would be hashed on backend, not stored in gradebook
        grades: {},
        lateSubmissions: {},
        submissionDates: {},
        practices: {},
      };
      resolve(newStudent);
    }, 100);
  });
}

// Simulates: DELETE /api/courses/:courseId/students/:studentId
export async function deleteStudent(courseId, studentId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id: studentId, deleted: true }), 100);
  });
}

// Simulates: PATCH /api/courses/:courseId/students/:studentId
export async function updateStudent(courseId, studentId, updates) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id: studentId, ...updates }), 100);
  });
}

// ============================================================================
// ASYNC ACTION CREATORS
// ============================================================================

// Initialize all courses and data
export async function initializeCourses(dispatch) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    // Fetch courses
    const courses = await fetchInstructorCourses();
    dispatch({ type: "SET_COURSES", payload: courses });

    // Set active course - prioritize last created course
    if (courses.length > 0) {
      const sortedCourses = [...courses].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA;
      });

      const mostRecentCourse = sortedCourses[0];
      dispatch({ type: "SET_ACTIVE_COURSE", payload: mostRecentCourse.id });

      // Load data for all courses in parallel
      await Promise.all(
        courses.map(async (course) => {
          const [assignments, practices, gradebook] = await Promise.all([
            fetchCourseAssignments(course.id),
            fetchCoursePractices(course.id),
            fetchCourseGradebook(course.id),
          ]);

          dispatch({
            type: "SET_ASSIGNMENTS",
            courseId: course.id,
            payload: assignments,
          });
          dispatch({
            type: "SET_PRACTICES",
            courseId: course.id,
            payload: practices,
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
  }
}

// Load data for a specific course
export async function loadCourseData(dispatch, courseId) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    const [assignments, practices, gradebook] = await Promise.all([
      fetchCourseAssignments(courseId),
      fetchCoursePractices(courseId),
      fetchCourseGradebook(courseId),
    ]);

    dispatch({ type: "SET_ASSIGNMENTS", courseId, payload: assignments });
    dispatch({ type: "SET_PRACTICES", courseId, payload: practices });
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

    // Get current gradebook
    const currentGradebook = await fetchCourseGradebook(courseId);
    const updatedGradebook = [...currentGradebook, newStudent];

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
  }
}

// Remove student from course
export async function removeStudentFromCourse(dispatch, courseId, studentId) {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    await deleteStudent(courseId, studentId);

    // Get current gradebook and filter out student
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

    await updateStudent(courseId, studentId, updates);

    // Get current gradebook and update student
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
