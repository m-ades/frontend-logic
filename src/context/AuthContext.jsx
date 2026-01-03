import { createContext, useContext, useReducer, useEffect } from "react";

const AuthStateContext = createContext();
const AuthDispatchContext = createContext();

function authReducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
      };
    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const initialState = {
  isAuthenticated: false,
  user: null,
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on mount (for persistence)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: "LOGIN", payload: user });
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error("useAuthState must be used within an AuthProvider");
  }
  return context;
}

export function useAuthDispatch() {
  const context = useContext(AuthDispatchContext);
  if (context === undefined) {
    throw new Error("useAuthDispatch must be used within an AuthProvider");
  }
  return context;
}

// Helper functions
export function login(dispatch, user) {
  localStorage.setItem("user", JSON.stringify(user));
  dispatch({ type: "LOGIN", payload: user });
}

export function logout(dispatch) {
  localStorage.removeItem("user");
  dispatch({ type: "LOGOUT" });
}

export function updateUser(dispatch, userData) {
  dispatch({ type: "UPDATE_USER", payload: userData });
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const user = JSON.parse(storedUser);
    localStorage.setItem("user", JSON.stringify({ ...user, ...userData }));
  }
}

// Hardcoded mock users for development
export const MOCK_USERS = {
  student: {
    id: "1",
    name: "John Student",
    email: "student@example.com",
    role: "student",
  },
  instructor: {
    id: "2",
    name: "Jane Instructor",
    email: "instructor@example.com",
    role: "instructor",
  },
};
