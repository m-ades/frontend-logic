import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Psychology as PracticeIcon,
  Grade as GradeIcon,
  Settings as SettingsIcon,
  ContactSupport as ContactIcon,
} from "@mui/icons-material";

export default [
  {
    id: 0,
    label: "Dashboard",
    link: "/dashboard",
    icon: <DashboardIcon />,
  },
  {
    id: 1,
    label: "Assignments",
    link: "/assignments",
    icon: <AssignmentIcon />,
  },
  {
    id: 2,
    label: "Practice",
    link: "/practice",
    icon: <PracticeIcon />,
  },
  {
    id: 3,
    label: "Grades",
    link: "/grades",
    icon: <GradeIcon />,
  },
  {
    id: 4,
    label: "Settings",
    link: "/settings",
    icon: <SettingsIcon />,
  },
  {
    id: 5,
    label: "Contact",
    link: "/contact",
    icon: <ContactIcon />,
  },
];
