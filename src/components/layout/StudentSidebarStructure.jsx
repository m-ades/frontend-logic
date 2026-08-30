import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Psychology as PracticeIcon,
  AutoStories as TextbookIcon,
  Grade as GradeIcon,
  ContactSupport as ContactIcon,
} from "@mui/icons-material";

export default [
  {
    id: 0,
    label: "Dashboard",
    link: "/student/dashboard",
    icon: <DashboardIcon />,
  },
  {
    id: 1,
    label: "Assignments",
    link: "/student/assignments",
    icon: <AssignmentIcon />,
  },
  {
    id: 2,
    label: "Practice",
    link: "/student/practice",
    icon: <PracticeIcon />,
  },
  {
    id: 3,
    label: "Textbook",
    link: "/student/textbook",
    icon: <TextbookIcon />,
  },
  {
    id: 4,
    label: "Grades",
    link: "/student/grades",
    icon: <GradeIcon />,
  },
  {
    id: 5,
    label: "Contact",
    link: "/student/contact",
    icon: <ContactIcon />,
  },
];
