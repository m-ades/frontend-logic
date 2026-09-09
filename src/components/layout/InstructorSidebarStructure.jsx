import {
  Dashboard as DashboardIcon,
  MenuBook as GradebookIcon,
  AutoStories as TextbookIcon,
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
    label: "Textbook",
    link: "/textbook-links",
    icon: <TextbookIcon />,
  },
  {
    id: 4,
    label: "Gradebook",
    link: "/gradebook",
    icon: <GradebookIcon />,
  },
  {
    id: 5,
    label: "Roster",
    link: "/roster",
    icon: <RosterIcon />,
  },
  {
    id: 6,
    label: "Contact",
    link: "/contact",
    icon: <ContactIcon />,
  },
  {
    id: 7,
    label: "Course Controls",
    link: "/controls",
    icon: <ControlsIcon />,
  },
];
