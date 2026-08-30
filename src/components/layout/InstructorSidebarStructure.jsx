import {
  Dashboard as DashboardIcon,
  MenuBook as GradebookIcon,
  ContactSupport as ContactIcon,
  AdminPanelSettings as ControlsIcon,
  Assignment as AssignmentIcon,
  FactCheck as RosterIcon,
  Psychology as PracticeIcon,
} from "@mui/icons-material";

export default [
  {
    id: 0,
    label: "Dashboard",
    link: "/instructor/dashboard",
    icon: <DashboardIcon />,
  },
  {
    id: 1,
    label: "Assignments",
    link: "/instructor/assignments",
    icon: <AssignmentIcon />,
  },
  {
    id: 2,
    label: "Practice",
    link: "/instructor/practice",
    icon: <PracticeIcon />,
  },
  {
    id: 3,
    label: "Gradebook",
    link: "/instructor/gradebook",
    icon: <GradebookIcon />,
  },
  {
    id: 4,
    label: "Roster",
    link: "/instructor/roster",
    icon: <RosterIcon />,
  },
  {
    id: 5,
    label: "Contact",
    link: "/instructor/contact",
    icon: <ContactIcon />,
  },
  {
    id: 6,
    label: "Course Controls",
    link: "/instructor/controls",
    icon: <ControlsIcon />,
  },
];
