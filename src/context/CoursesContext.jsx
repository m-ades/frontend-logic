import { createContext, useContext, useReducer, useEffect } from "react";

const CoursesStateContext = createContext();
const CoursesDispatchContext = createContext();

function coursesReducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_COURSE":
      localStorage.setItem("activeCourseId", action.payload);
      return {
        ...state,
        activeCourseId: action.payload,
      };
    case "SET_COURSES":
      return {
        ...state,
        courses: action.payload,
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// Mock courses data for instructors
const MOCK_INSTRUCTOR_COURSES = [
  {
    id: "1",
    name: "PHILO/MATH/CSCI 275 - Spring 2025",
    code: "PHIL275-01",
    semester: "Spring 2025",
    status: "current",
    students: 32,
    color: "#1976d2",
  },
  {
    id: "2",
    name: "PHILO/MATH/CSCI 275 - Fall 2024",
    code: "PHIL275-02",
    semester: "Fall 2024",
    status: "past",
    students: 28,
    color: "#2e7d32",
  },
  {
    id: "3",
    name: "Logic & Critical Thinking - Spring 2025",
    code: "PHIL101-01",
    semester: "Spring 2025",
    status: "current",
    students: 45,
    color: "#ed6c02",
  },
  {
    id: "4",
    name: "Advanced Logic - Fall 2024",
    code: "PHIL375-01",
    semester: "Fall 2024",
    status: "past",
    students: 15,
    color: "#9c27b0",
  },
];

// Mock courses data for students
const MOCK_STUDENT_COURSES = [
  {
    id: "1",
    name: "PHILO/MATH/CSCI 275 - Spring 2025",
    code: "PHIL275-01",
    semester: "Spring 2025",
    status: "current",
    instructor: "Dr. Smith",
    color: "#1976d2",
  },
  {
    id: "3",
    name: "Logic & Critical Thinking - Spring 2025",
    code: "PHIL101-01",
    semester: "Spring 2025",
    status: "current",
    instructor: "Prof. Johnson",
    color: "#ed6c02",
  },
  {
    id: "5",
    name: "Introduction to Philosophy - Fall 2024",
    code: "PHIL100-01",
    semester: "Fall 2024",
    status: "past",
    instructor: "Dr. Williams",
    color: "#2e7d32",
  },
];

const initialState = {
  courses: [],
  activeCourseId: null,
};

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

export function useCoursesState() {
  const context = useContext(CoursesStateContext);
  if (context === undefined) {
    throw new Error("useCoursesState must be used within a CoursesProvider");
  }
  return context;
}

export function useCoursesDispatch() {
  const context = useContext(CoursesDispatchContext);
  if (context === undefined) {
    throw new Error("useCoursesDispatch must be used within a CoursesProvider");
  }
  return context;
}

export function setActiveCourse(dispatch, courseId) {
  dispatch({ type: "SET_ACTIVE_COURSE", payload: courseId });
}

export function setCourses(dispatch, courses) {
  dispatch({ type: "SET_COURSES", payload: courses });
}

export function initializeCourses(dispatch, userRole) {
  const courses =
    userRole === "instructor" ? MOCK_INSTRUCTOR_COURSES : MOCK_STUDENT_COURSES;
  dispatch({ type: "SET_COURSES", payload: courses });

  // Load active course from localStorage or default to first current course
  const storedCourseId = localStorage.getItem("activeCourseId");
  if (storedCourseId && courses.find((c) => c.id === storedCourseId)) {
    dispatch({ type: "SET_ACTIVE_COURSE", payload: storedCourseId });
  } else if (courses.length > 0) {
    const firstCurrent = courses.find((c) => c.status === "current");
    if (firstCurrent) {
      dispatch({ type: "SET_ACTIVE_COURSE", payload: firstCurrent.id });
    }
  }
}
