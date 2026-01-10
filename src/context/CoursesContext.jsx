import { createContext, useContext, useReducer, useEffect } from "react";
import {
  MOCK_INSTRUCTOR_COURSES,
  MOCK_ASSIGNMENTS_BY_COURSE,
  MOCK_GRADEBOOK_BY_COURSE,
} from "./mockData/courses";

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
  // TODO: Replace with actual API call
  // const response = await fetch('/api/instructor/courses');
  // if (!response.ok) throw new Error('Failed to fetch courses');
  // return response.json();

  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_INSTRUCTOR_COURSES), 100);
  });
}

// Simulates: GET /api/courses/:courseId/assignments
export async function fetchCourseAssignments(courseId) {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/courses/${courseId}/assignments`);
  // if (!response.ok) throw new Error('Failed to fetch assignments');
  // return response.json();

  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_ASSIGNMENTS_BY_COURSE[courseId] || []), 100);
  });
}

// Simulates: GET /api/courses/:courseId/gradebook
export async function fetchCourseGradebook(courseId) {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/courses/${courseId}/gradebook`);
  // if (!response.ok) throw new Error('Failed to fetch gradebook');
  // return response.json();

  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_GRADEBOOK_BY_COURSE[courseId] || []), 100);
  });
}

// Simulates: PATCH /api/courses/:courseId
export async function updateCourse(courseId, updates) {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/courses/${courseId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(updates)
  // });
  // if (!response.ok) throw new Error('Failed to update course');
  // return response.json();

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

// Calculate grade distribution
export function calculateGradeDistribution(students) {
  const distribution = [
    { grade: "A", range: "90-100", count: 0, color: "#10b981" },
    { grade: "B", range: "80-89", count: 0, color: "#6366f1" },
    { grade: "C", range: "70-79", count: 0, color: "#f59e0b" },
    { grade: "D", range: "60-69", count: 0, color: "#f97316" },
    { grade: "F", range: "0-59", count: 0, color: "#ef4444" },
  ];

  students.forEach((student) => {
    const grades = Object.values(student.grades).filter(
      (g) => g !== undefined && g !== null
    );
    if (grades.length === 0) return;

    const average = Math.round(
      grades.reduce((sum, g) => sum + g, 0) / grades.length
    );

    if (average >= 90) distribution[0].count++;
    else if (average >= 80) distribution[1].count++;
    else if (average >= 70) distribution[2].count++;
    else if (average >= 60) distribution[3].count++;
    else distribution[4].count++;
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
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...a, daysLeft: diffDays };
    })
    .filter((a) => a.daysLeft >= 0 && a.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

// Helper function to calculate grade with late penalty
export function calculateGradeWithLatePenalty(
  earnedGrade,
  daysLate,
  latePolicy
) {
  if (!latePolicy.enabled || daysLate <= 0) {
    return earnedGrade;
  }

  if (daysLate > latePolicy.maxDaysLate) {
    return 0; // No credit if submitted beyond allowed window
  }

  const penalty = daysLate * latePolicy.penaltyPerDay;
  return Math.max(0, earnedGrade - penalty);
}

// ============================================================================
// REDUCER
// ============================================================================

const initialState = {
  courses: [],
  activeCourseId: null,
  assignmentsByCourse: {},
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
  const { courses, activeCourseId, assignmentsByCourse, gradebookByCourse } =
    useCoursesState();

  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const assignments = activeCourseId
    ? assignmentsByCourse[activeCourseId] || []
    : [];
  const gradebook = activeCourseId
    ? gradebookByCourse[activeCourseId] || []
    : [];

  return {
    course: activeCourse,
    assignments,
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

export function setGradebook(dispatch, courseId, gradebook) {
  dispatch({ type: "SET_GRADEBOOK", courseId, payload: gradebook });
}

export function updateCourseName(dispatch, courseId, name) {
  dispatch({ type: "UPDATE_COURSE_NAME", courseId, payload: name });
}

export function updateLatePolicy(dispatch, courseId, latePolicy) {
  dispatch({ type: "UPDATE_LATE_POLICY", courseId, payload: latePolicy });
}

export function updateCourseSettings(dispatch, courseId, settings) {
  dispatch({ type: "UPDATE_COURSE_SETTINGS", courseId, payload: settings });
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

    // Set active course to first course
    if (courses.length > 0) {
      dispatch({ type: "SET_ACTIVE_COURSE", payload: courses[0].id });

      // Load data for all courses in parallel
      await Promise.all(
        courses.map(async (course) => {
          const [assignments, gradebook] = await Promise.all([
            fetchCourseAssignments(course.id),
            fetchCourseGradebook(course.id),
          ]);

          dispatch({
            type: "SET_ASSIGNMENTS",
            courseId: course.id,
            payload: assignments,
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

    const [assignments, gradebook] = await Promise.all([
      fetchCourseAssignments(courseId),
      fetchCourseGradebook(courseId),
    ]);

    dispatch({ type: "SET_ASSIGNMENTS", courseId, payload: assignments });
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
