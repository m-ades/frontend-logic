import { createContext, useContext, useReducer } from "react";

// Context for state and dispatch
const CoursesStateContext = createContext();
const CoursesDispatchContext = createContext();

// Mock data - replace with API calls
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
];

const MOCK_ASSIGNMENTS_BY_COURSE = {
  1: [
    { id: "a1", name: "Assignment 1" },
    { id: "a2", name: "Assignment 2" },
    { id: "a3", name: "Assignment 3" },
    { id: "a4", name: "Assignment 4" },
    { id: "a5", name: "Assignment 5" },
    { id: "a6", name: "Assignment 6" },
    { id: "a7", name: "Assignment 7" },
    { id: "a8", name: "Assignment 8" },
    { id: "a9", name: "Assignment 9" },
    { id: "a10", name: "Assignment 10" },
    { id: "a11", name: "Assignment 11" },
    { id: "a12", name: "Assignment 12" },
  ],
};

const MOCK_GRADEBOOK_BY_COURSE = {
  1: [
    {
      id: "s1",
      name: "Alice Johnson",
      grades: {
        a1: 90,
        a2: 85,
        a3: 92,
        a4: 87,
        a5: 84,
        a6: 90,
        a7: 88,
        a8: 91,
        a9: 89,
        a10: 93,
        a11: 87,
        a12: 90,
      },
    },
    {
      id: "s2",
      name: "Bob Smith",
      grades: {
        a1: 70,
        a2: 68,
        a3: 75,
        a4: 80,
        a5: 77,
        a6: 72,
        a7: 74,
        a8: 78,
        a9: 73,
        a10: 76,
        a11: 79,
        a12: 75,
      },
    },
    {
      id: "s3",
      name: "Carla Martinez",
      grades: {
        a1: 95,
        a2: 93,
        a3: 96,
        a4: 94,
        a5: 91,
        a6: 97,
        a7: 95,
        a8: 96,
        a9: 94,
        a10: 98,
        a11: 93,
        a12: 97,
      },
    },
    {
      id: "s4",
      name: "David Chen",
      grades: {
        a1: 82,
        a2: 85,
        a3: 88,
        a4: 84,
        a5: 86,
        a6: 83,
        a7: 87,
        a8: 85,
        a9: 86,
        a10: 89,
        a11: 84,
        a12: 88,
      },
    },
    {
      id: "s5",
      name: "Emma Wilson",
      grades: {
        a1: 78,
        a2: 80,
        a3: 82,
        a4: 79,
        a5: 81,
        a6: 77,
        a7: 83,
        a8: 80,
        a9: 82,
        a10: 84,
        a11: 79,
        a12: 81,
      },
    },
    {
      id: "s6",
      name: "Frank Rodriguez",
      grades: {
        a1: 91,
        a2: 89,
        a3: 92,
        a4: 90,
        a5: 88,
        a6: 93,
        a7: 91,
        a8: 90,
        a9: 92,
        a10: 94,
        a11: 89,
        a12: 91,
      },
    },
    {
      id: "s7",
      name: "Grace Lee",
      grades: {
        a1: 65,
        a2: 68,
        a3: 70,
        a4: 67,
        a5: 72,
        a6: 69,
        a7: 71,
        a8: 73,
        a9: 70,
        a10: 74,
        a11: 68,
        a12: 72,
      },
    },
    {
      id: "s8",
      name: "Henry Taylor",
      grades: {
        a1: 88,
        a2: 87,
        a3: 90,
        a4: 85,
        a5: 89,
        a6: 86,
        a7: 88,
        a8: 91,
        a9: 87,
        a10: 90,
        a11: 88,
        a12: 89,
      },
    },
    {
      id: "s9",
      name: "Isabel Garcia",
      grades: {
        a1: 76,
        a2: 78,
        a3: 80,
        a4: 77,
        a5: 79,
        a6: 75,
        a7: 81,
        a8: 79,
        a9: 78,
        a10: 82,
        a11: 77,
        a12: 80,
      },
    },
    {
      id: "s10",
      name: "Jack Anderson",
      grades: {
        a1: 92,
        a2: 94,
        a3: 91,
        a4: 93,
        a5: 95,
        a6: 90,
        a7: 94,
        a8: 92,
        a9: 93,
        a10: 96,
        a11: 91,
        a12: 94,
      },
    },
    {
      id: "s11",
      name: "Kelly Brown",
      grades: {
        a1: 83,
        a2: 81,
        a3: 85,
        a4: 82,
        a5: 84,
        a6: 80,
        a7: 86,
        a8: 83,
        a9: 85,
        a10: 87,
        a11: 82,
        a12: 84,
      },
    },
    {
      id: "s12",
      name: "Liam Murphy",
      grades: {
        a1: 58,
        a2: 62,
        a3: 65,
        a4: 60,
        a5: 64,
        a6: 59,
        a7: 66,
        a8: 63,
        a9: 61,
        a10: 67,
        a11: 62,
        a12: 64,
      },
    },
    {
      id: "s13",
      name: "Maya Patel",
      grades: {
        a1: 89,
        a2: 91,
        a3: 88,
        a4: 90,
        a5: 92,
        a6: 87,
        a7: 91,
        a8: 89,
        a9: 90,
        a10: 93,
        a11: 88,
        a12: 91,
      },
    },
    {
      id: "s14",
      name: "Noah Kim",
      grades: {
        a1: 74,
        a2: 76,
        a3: 78,
        a4: 75,
        a5: 77,
        a6: 73,
        a7: 79,
        a8: 76,
        a9: 78,
        a10: 80,
        a11: 75,
        a12: 77,
      },
    },
    {
      id: "s15",
      name: "Olivia White",
      grades: {
        a1: 96,
        a2: 95,
        a3: 97,
        a4: 94,
        a5: 96,
        a6: 98,
        a7: 95,
        a8: 97,
        a9: 96,
        a10: 99,
        a11: 94,
        a12: 97,
      },
    },
    {
      id: "s16",
      name: "Peter Jackson",
      grades: {
        a1: 81,
        a2: 83,
        a3: 85,
        a4: 82,
        a5: 84,
        a6: 80,
        a7: 86,
        a8: 83,
        a9: 85,
        a10: 87,
        a11: 82,
        a12: 84,
      },
    },
    {
      id: "s17",
      name: "Quinn Davis",
      grades: {
        a1: 87,
        a2: 89,
        a3: 86,
        a4: 88,
        a5: 90,
        a6: 85,
        a7: 89,
        a8: 87,
        a9: 88,
        a10: 91,
        a11: 86,
        a12: 89,
      },
    },
    {
      id: "s18",
      name: "Rachel Green",
      grades: {
        a1: 72,
        a2: 74,
        a3: 76,
        a4: 73,
        a5: 75,
        a6: 71,
        a7: 77,
        a8: 74,
        a9: 76,
        a10: 78,
        a11: 73,
        a12: 75,
      },
    },
    {
      id: "s19",
      name: "Samuel Hall",
      grades: {
        a1: 93,
        a2: 91,
        a3: 94,
        a4: 92,
        a5: 93,
        a6: 95,
        a7: 92,
        a8: 94,
        a9: 93,
        a10: 96,
        a11: 91,
        a12: 94,
      },
    },
    {
      id: "s20",
      name: "Tina Lopez",
      grades: {
        a1: 79,
        a2: 81,
        a3: 83,
        a4: 80,
        a5: 82,
        a6: 78,
        a7: 84,
        a8: 81,
        a9: 83,
        a10: 85,
        a11: 80,
        a12: 82,
      },
    },
    {
      id: "s21",
      name: "Uma Singh",
      grades: {
        a1: 86,
        a2: 88,
        a3: 85,
        a4: 87,
        a5: 89,
        a6: 84,
        a7: 88,
        a8: 86,
        a9: 87,
        a10: 90,
        a11: 85,
        a12: 88,
      },
    },
    {
      id: "s22",
      name: "Victor Nguyen",
      grades: {
        a1: 68,
        a2: 70,
        a3: 72,
        a4: 69,
        a5: 71,
        a6: 67,
        a7: 73,
        a8: 70,
        a9: 72,
        a10: 74,
        a11: 69,
        a12: 71,
      },
    },
    {
      id: "s23",
      name: "Wendy Clark",
      grades: {
        a1: 90,
        a2: 92,
        a3: 89,
        a4: 91,
        a5: 93,
        a6: 88,
        a7: 92,
        a8: 90,
        a9: 91,
        a10: 94,
        a11: 89,
        a12: 92,
      },
    },
    {
      id: "s24",
      name: "Xavier Torres",
      grades: {
        a1: 75,
        a2: 77,
        a3: 79,
        a4: 76,
        a5: 78,
        a6: 74,
        a7: 80,
        a8: 77,
        a9: 79,
        a10: 81,
        a11: 76,
        a12: 78,
      },
    },
    {
      id: "s25",
      name: "Yara Ahmed",
      grades: {
        a1: 94,
        a2: 96,
        a3: 93,
        a4: 95,
        a5: 97,
        a6: 92,
        a7: 96,
        a8: 94,
        a9: 95,
        a10: 98,
        a11: 93,
        a12: 96,
      },
    },
    {
      id: "s26",
      name: "Zachary Moore",
      grades: {
        a1: 84,
        a2: 86,
        a3: 88,
        a4: 85,
        a5: 87,
        a6: 83,
        a7: 89,
        a8: 86,
        a9: 88,
        a10: 90,
        a11: 85,
        a12: 87,
      },
    },
    {
      id: "s27",
      name: "Amy Scott",
      grades: {
        a1: 71,
        a2: 73,
        a3: 75,
        a4: 72,
        a5: 74,
        a6: 70,
        a7: 76,
        a8: 73,
        a9: 75,
        a10: 77,
        a11: 72,
        a12: 74,
      },
    },
    {
      id: "s28",
      name: "Brian Foster",
      grades: {
        a1: 88,
        a2: 90,
        a3: 87,
        a4: 89,
        a5: 91,
        a6: 86,
        a7: 90,
        a8: 88,
        a9: 89,
        a10: 92,
        a11: 87,
        a12: 90,
      },
    },
    {
      id: "s29",
      name: "Claire Hill",
      grades: {
        a1: 80,
        a2: 82,
        a3: 84,
        a4: 81,
        a5: 83,
        a6: 79,
        a7: 85,
        a8: 82,
        a9: 84,
        a10: 86,
        a11: 81,
        a12: 83,
      },
    },
    {
      id: "s30",
      name: "Daniel Reed",
      grades: {
        a1: 91,
        a2: 93,
        a3: 90,
        a4: 92,
        a5: 94,
        a6: 89,
        a7: 93,
        a8: 91,
        a9: 92,
        a10: 95,
        a11: 90,
        a12: 93,
      },
    },
  ],
};

// Initial state
const initialState = {
  courses: [],
  activeCourseId: null,
  assignmentsByCourse: {},
  gradebookByCourse: {},
};

// Reducer
function coursesReducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_COURSE":
      return { ...state, activeCourseId: action.payload };

    case "SET_COURSES":
      return { ...state, courses: action.payload };

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

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// Provider component
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

// Custom hooks
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

// Action creators
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

// Initialize courses with mock data
export function initializeCourses(dispatch) {
  // Set courses
  dispatch({ type: "SET_COURSES", payload: MOCK_INSTRUCTOR_COURSES });

  // Set active course to first course
  dispatch({
    type: "SET_ACTIVE_COURSE",
    payload: MOCK_INSTRUCTOR_COURSES[0]?.id ?? null,
  });

  // Load assignments for each course
  Object.entries(MOCK_ASSIGNMENTS_BY_COURSE).forEach(
    ([courseId, assignments]) => {
      dispatch({ type: "SET_ASSIGNMENTS", courseId, payload: assignments });
    }
  );

  // Load gradebook for each course
  Object.entries(MOCK_GRADEBOOK_BY_COURSE).forEach(([courseId, gradebook]) => {
    dispatch({ type: "SET_GRADEBOOK", courseId, payload: gradebook });
  });
}
