import { Navigate } from "react-router-dom";
import { useAuthState } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuthState();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    return (
      <Navigate
        to={user?.role === "instructor" ? "/instructor" : "/dashboard"}
        replace
      />
    );
  }

  return children;
}
