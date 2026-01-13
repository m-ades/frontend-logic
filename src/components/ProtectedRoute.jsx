import { Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuthState } from "../context/AuthContext";
import { normalizeRole } from "../utils/auth.js";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user, isLoading } = useAuthState();
  const normalizedRole = normalizeRole(user?.role);

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
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
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
