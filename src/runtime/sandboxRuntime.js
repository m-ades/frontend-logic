const studentSectionLabels = {
  dashboard: "Dashboard",
  courses: "My Courses",
  assignments: "Assignments",
  grades: "Grades",
  practice: "Practice",
  contact: "Contact",
  profile: "Profile & Preferences",
};

const instructorSectionLabels = {
  dashboard: "Dashboard",
  courses: "All Courses",
  assignments: "Assignments",
  gradebook: "Gradebook",
  controls: "Course Controls",
  contact: "Contact",
  roster: "Roster",
  profile: "Profile & Preferences",
  practice: "Practice",
};

export function getRoutePrefix(routeKind) {
  return routeKind === "instructor" ? "/instructor" : "/student";
}

export function remapRoutePath(path, sourcePrefix, routePrefix) {
  if (typeof path !== "string") return path;
  if (path === sourcePrefix) return routePrefix;
  if (!path.startsWith(`${sourcePrefix}/`)) return path;
  return `${routePrefix}${path.slice(sourcePrefix.length)}`;
}

export function remapStudentPath(path, routePrefix = "/student") {
  return remapRoutePath(path, "/student", routePrefix);
}

export function buildRuntimePaths(routeKind, routePrefix = getRoutePrefix(routeKind)) {
  const isInstructor = routeKind === "instructor";
  const gradesPath = isInstructor ? `${routePrefix}/gradebook` : `${routePrefix}/grades`;

  return {
    routeKind,
    routePrefix,
    isInstructor,
    dashboardPath: `${routePrefix}/dashboard`,
    coursesPath: `${routePrefix}/courses`,
    assignmentsPath: `${routePrefix}/assignments`,
    gradesPath,
    gradebookPath: isInstructor ? `${routePrefix}/gradebook` : undefined,
    practicePath: `${routePrefix}/practice`,
    contactPath: `${routePrefix}/contact`,
    profilePath: `${routePrefix}/profile`,
    rosterPath: isInstructor ? `${routePrefix}/roster` : undefined,
    controlsPath: isInstructor ? `${routePrefix}/controls` : undefined,
    assignmentBuilderPath: isInstructor ? `${routePrefix}/assignment-builder` : undefined,
    assignmentPath: (assignmentId) => `${routePrefix}/assignment/${assignmentId}`,
  };
}

export function buildBreadcrumbInfo(pathname, {
  routeKind,
  routePrefix = getRoutePrefix(routeKind),
  stripPrefix = routePrefix,
}) {
  const normalizedPath = pathname === stripPrefix
    ? "/dashboard"
    : pathname.startsWith(`${stripPrefix}/`)
    ? pathname.slice(stripPrefix.length) || "/dashboard"
    : pathname;

  if (normalizedPath.startsWith("/assignment/") || normalizedPath.startsWith("/assignment-builder")) {
    return {
      label: "Assignments",
      path: `${routePrefix}/assignments`,
    };
  }

  if (normalizedPath.startsWith("/worksheet/")) {
    return {
      label: "Worksheet",
      path: `${routePrefix}/assignments`,
    };
  }

  const [section = "dashboard"] = normalizedPath.split("/").filter(Boolean);
  const labels = routeKind === "instructor"
    ? instructorSectionLabels
    : studentSectionLabels;

  return {
    label: labels[section] || labels.dashboard,
    path: `${routePrefix}/${section}`,
  };
}
