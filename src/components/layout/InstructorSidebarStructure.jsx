import {
  Dashboard as DashboardIcon,
  MenuBook as GradebookIcon,
  Settings as SettingsIcon,
  ContactSupport as ContactIcon,
  AdminPanelSettings as ControlsIcon,
  Assignment as AssignmentIcon,
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
    label: "Gradebook",
    link: "/instructor/gradebook",
    icon: <GradebookIcon />,
  },
  {
    id: 3,
    label: "Controls",
    link: "/instructor/controls",
    icon: <ControlsIcon />,
  },
  {
    id: 4,
    label: "Settings",
    link: "/instructor/settings",
    icon: <SettingsIcon />,
  },
  {
    id: 5,
    label: "Contact",
    link: "/instructor/contact",
    icon: <ContactIcon />,
  },
];
