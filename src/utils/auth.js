export const normalizeRole = (role) => {
  if (!role) return null;
  if (role === "ta") return "student";
  return role;
};

export const isInstructorRole = (role) => normalizeRole(role) === "instructor";

// per course unlike the global role which is instructor if you teach anything
export const hasInstructorAccess = (user, courseRole) =>
  Boolean(user?.is_system_admin) || courseRole === "instructor";
