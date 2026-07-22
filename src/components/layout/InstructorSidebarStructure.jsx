import {
  Dashboard as DashboardIcon,
  MenuBook as GradebookIcon,
  Link as TextbookLinksIcon,
  ContactSupport as ContactIcon,
  AdminPanelSettings as ControlsIcon,
  Assignment as AssignmentIcon,
  FactCheck as RosterIcon,
} from "@mui/icons-material";
import { Brain } from "lucide-react";

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
    icon: <Brain />,
  },
  {
    id: 3,
    label: "Textbook Links",
    link: "/instructor/textbook-links",
    icon: <TextbookLinksIcon />,
  },
  {
    id: 4,
    label: "Gradebook",
    link: "/instructor/gradebook",
    icon: <GradebookIcon />,
  },
  {
    id: 5,
    label: "Roster",
    link: "/instructor/roster",
    icon: <RosterIcon />,
  },
  {
    id: 6,
    label: "Contact",
    link: "/instructor/contact",
    icon: <ContactIcon />,
  },
  {
    id: 7,
    label: "Course Controls",
    link: "/instructor/controls",
    icon: <ControlsIcon />,
  },
];
