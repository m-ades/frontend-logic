import {
  Dashboard as DashboardIcon,
  MenuBook as GradebookIcon,
  Settings as SettingsIcon,
  ContactSupport as ContactIcon,
  AdminPanelSettings as ControlsIcon,
} from "@mui/icons-material";

export default [
  {
    id: 0,
    label: "Dashboard",
    link: "/instructor/",
    icon: <DashboardIcon />,
  },
  {
    id: 1,
    label: "Gradebook",
    link: "/instructor/gradebook",
    icon: <GradebookIcon />,
  },
  {
    id: 2,
    label: "Controls",
    link: "/instructor/controls",
    icon: <ControlsIcon />,
  },
  {
    id: 3,
    label: "Settings",
    link: "/instructor/settings",
    icon: <SettingsIcon />,
  },
  {
    id: 4,
    label: "Contact",
    link: "/instructor/contact",
    icon: <ContactIcon />,
  },
];
