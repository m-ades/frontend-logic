export const normalizeRole = (role) => {
  if (!role) return null;
  if (role === "ta") return "student";
  return role;
};

export const isInstructorRole = (role) => normalizeRole(role) === "instructor";
