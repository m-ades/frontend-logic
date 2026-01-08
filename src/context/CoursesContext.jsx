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

// Mock courses data
const MOCK_COURSES = [
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

const initialState = {
  courses: MOCK_COURSES,
  activeCourseId: null,
};

export function CoursesProvider({ children }) {
  const [state, dispatch] = useReducer(coursesReducer, initialState);

  // Load active course from localStorage on mount
  useEffect(() => {
    const storedCourseId = localStorage.getItem("activeCourseId");
    if (storedCourseId) {
      dispatch({ type: "SET_ACTIVE_COURSE", payload: storedCourseId });
    } else if (MOCK_COURSES.length > 0) {
      // Default to first current course
      const firstCurrent = MOCK_COURSES.find((c) => c.status === "current");
      if (firstCurrent) {
        dispatch({ type: "SET_ACTIVE_COURSE", payload: firstCurrent.id });
      }
    }
  }, []);

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
