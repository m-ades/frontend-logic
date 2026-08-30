import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Psychology as PracticeIcon,
  AutoStories as LearnIcon,
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
    label: "Learn",
    link: "/student/learn",
    icon: <LearnIcon />,
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
