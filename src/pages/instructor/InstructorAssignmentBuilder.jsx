import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AssignmentBuilder() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the assignment or practice ID from location state
  const { assignmentId, practiceId } = location.state || {};
  useEffect(() => {
    if (assignmentId) {
      navigate(`/assignment/${assignmentId}`, {
        replace: true,
        state: { returnTo: "/assignments" },
      });
      return;
    }
    if (practiceId) {
      navigate(`/assignment/${practiceId}`, {
        replace: true,
        state: { returnTo: "/practice" },
      });
      return;
    }
    navigate("/assignments", { replace: true });
  }, [assignmentId, practiceId, navigate]);

  return null;
}
