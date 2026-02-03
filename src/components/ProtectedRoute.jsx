import { Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { useAuthState } from "../context/AuthContext";
import { normalizeRole } from "../utils/auth.js";
import LoadingSpinner from "./ui/LoadingSpinner.jsx";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user, isLoading } = useAuthState();
  const location = useLocation();
  const normalizedRole = normalizeRole(user?.role);
  const searchParams = new URLSearchParams(location.search || "");
  const previewAs = searchParams.get("preview");
  const isInstructorPreviewingStudent =
    normalizedRole === "instructor" && previewAs === "student";

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <LoadingSpinner label="Loading..." />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(normalizedRole) &&
    !isInstructorPreviewingStudent
  ) {
    // Redirect to appropriate dashboard based on role
    if (!normalizedRole) {
      return <Navigate to="/login" replace />;
    }
    return (
      <Navigate
        to={
          normalizedRole === "instructor"
            ? "/instructor/dashboard"
            : "/student/dashboard"
        }
        replace
      />
    );
  }

  return children;
}
