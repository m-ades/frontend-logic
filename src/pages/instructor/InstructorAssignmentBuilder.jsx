import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AssignmentBuilder() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the assignment or practice ID from location state
  const { assignmentId, practiceId } = location.state || {};
  useEffect(() => {
    if (assignmentId) {
      navigate(`/instructor/assignment/${assignmentId}`, {
        replace: true,
        state: { returnTo: "/instructor/assignments" },
      });
      return;
    }
    if (practiceId) {
      navigate(`/instructor/assignment/${practiceId}`, {
        replace: true,
        state: { returnTo: "/instructor/practice" },
      });
      return;
    }
    navigate("/instructor/assignments", { replace: true });
  }, [assignmentId, practiceId, navigate]);

  return null;
}
