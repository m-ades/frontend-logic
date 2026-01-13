import { createContext, useContext, useReducer, useEffect } from "react";
import { clearStoredUser, getStoredUser, setStoredUser } from "../utils/api.js";
import { normalizeRole } from "../utils/auth.js";

const AuthStateContext = createContext();
const AuthDispatchContext = createContext();

function authReducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        isLoading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const initialState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      const normalizedRole = normalizeRole(storedUser.role);
      if (!normalizedRole) {
        clearStoredUser();
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }
      const normalizedUser = { ...storedUser, role: normalizedRole };
      if (normalizedRole !== storedUser.role) {
        setStoredUser(normalizedUser);
      }
      dispatch({ type: "LOGIN", payload: normalizedUser });
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
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

export function login(dispatch, user) {
  setStoredUser(user);
  dispatch({ type: "LOGIN", payload: user });
}

export function logout(dispatch) {
  clearStoredUser();
  dispatch({ type: "LOGOUT" });
}

export function updateUser(dispatch, userData) {
  dispatch({ type: "UPDATE_USER", payload: userData });
  const storedUser = getStoredUser();
  if (storedUser) {
    setStoredUser({ ...storedUser, ...userData });
  }
}
