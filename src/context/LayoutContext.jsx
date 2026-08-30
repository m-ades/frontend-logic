import { createContext, useContext, useReducer } from "react";

const LayoutStateContext = createContext();
const LayoutDispatchContext = createContext();
const RULEBOOK_OPEN_STORAGE_KEY = "logic-app:rulebook-open";
const RULEBOOK_HINT_STORAGE_KEY = "logic-app:rulebook-hint-seen";

const RULEBOOK_PROBLEM_TYPES = new Set([
  "derivation",
  "derivation-hurley",
  "derivation-calgary",
  "symbolic-translation",
  "combo-translation-truth-table",
  "combo-translation-derivation",
  "proof-argument-extraction",
]);

function readStoredBoolean(key) {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function storeBoolean(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // storage can fail and the current session still works
  }
}

function layoutReducer(state, action) {
  switch (action.type) {
    case "TOGGLE_SIDEBAR":
      return { ...state, isSidebarOpened: !state.isSidebarOpened };
    case "SET_SIDEBAR":
      return { ...state, isSidebarOpened: action.payload };
    case "TOGGLE_SIDEBAR_HOVER":
      return { ...state, sidebarHoverEnabled: !state.sidebarHoverEnabled };
    case "UPDATE_RULES_REFERENCE":
      return {
        ...state,
        isRulesReferenceOpen: action.payload.isOpen ?? state.isRulesReferenceOpen,
        showRulesReferenceHint: action.payload.showHint ?? state.showRulesReferenceHint,
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function LayoutProvider({ children }) {
  const [state, dispatch] = useReducer(layoutReducer, {
    isSidebarOpened: false, // Changed to false - start collapsed
    sidebarHoverEnabled: true, // Default to hover enabled
    isRulesReferenceOpen: false,
    showRulesReferenceHint: false,
  });

  return (
    <LayoutStateContext.Provider value={state}>
      <LayoutDispatchContext.Provider value={dispatch}>
        {children}
      </LayoutDispatchContext.Provider>
    </LayoutStateContext.Provider>
  );
}

export function useLayoutState() {
  const context = useContext(LayoutStateContext);
  if (context === undefined) {
    throw new Error("useLayoutState must be used within a LayoutProvider");
  }
  return context;
}

export function useLayoutDispatch() {
  const context = useContext(LayoutDispatchContext);
  if (context === undefined) {
    throw new Error("useLayoutDispatch must be used within a LayoutProvider");
  }
  return context;
}

export function toggleSidebar(dispatch) {
  dispatch({
    type: "TOGGLE_SIDEBAR",
  });
}

export function setSidebar(dispatch, isOpen) {
  dispatch({
    type: "SET_SIDEBAR",
    payload: isOpen,
  });
}

export function toggleSidebarHover(dispatch) {
  dispatch({
    type: "TOGGLE_SIDEBAR_HOVER",
  });
}

export function setRulesReferenceOpen(dispatch, isOpen) {
  storeBoolean(RULEBOOK_OPEN_STORAGE_KEY, isOpen);
  if (isOpen) storeBoolean(RULEBOOK_HINT_STORAGE_KEY, true);
  dispatch({
    type: "UPDATE_RULES_REFERENCE",
    payload: { isOpen, showHint: false },
  });
}

// applies automatic rulebook behavior when the active question changes
// manual open state is preserved when moving to an unrelated problem type
export function updateRulebookForProblem(dispatch, problemType) {
  if (!problemType) {
    dispatch({
      type: "UPDATE_RULES_REFERENCE",
      payload: { isOpen: false, showHint: false },
    });
    return;
  }

  if (!RULEBOOK_PROBLEM_TYPES.has(problemType)) {
    dispatch({
      type: "UPDATE_RULES_REFERENCE",
      payload: { showHint: false },
    });
    return;
  }

  const isOpen = readStoredBoolean(RULEBOOK_OPEN_STORAGE_KEY);
  const showHint = !isOpen && !readStoredBoolean(RULEBOOK_HINT_STORAGE_KEY);
  if (isOpen || showHint) storeBoolean(RULEBOOK_HINT_STORAGE_KEY, true);

  dispatch({
    type: "UPDATE_RULES_REFERENCE",
    payload: { isOpen, showHint },
  });
}

export function dismissRulesReferenceHint(dispatch) {
  dispatch({
    type: "UPDATE_RULES_REFERENCE",
    payload: { showHint: false },
  });
}
