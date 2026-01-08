import { Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuthState } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user, isLoading } = useAuthState();

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

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    return (
      <Navigate
        to={
          user?.role === "instructor"
            ? "/instructor/dashboard"
            : "/student/dashboard"
        }
        replace
      />
    );
  }

  return children;
}
