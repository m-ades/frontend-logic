import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { getCourseStructureByTypes, ACTIVITY_TYPES } from '../../placeholder/courseActivities.js'

const generateSidebarStructure = () => {
  const assignmentStructure = getCourseStructureByTypes([
    ACTIVITY_TYPES.HOMEWORK,
    ACTIVITY_TYPES.QUIZ,
    ACTIVITY_TYPES.EXAM,
  ])

  const practiceStructure = getCourseStructureByTypes([ACTIVITY_TYPES.PRACTICE])

  const mapStructure = (structure, baseLink) => {
    const children = []
    structure.forEach((chapter) => {
      const subchapterChildren = (chapter.subchapters || []).map((subchapter) => ({
        label: subchapter.title,
        children: (subchapter.activities || []).map((activity) => ({
          label: activity.title,
          link: activity.worksheet ? `/assignment/${activity.worksheet.id}` : baseLink,
        })),
      }))

      children.push({
        label: chapter.title,
        children: subchapterChildren,
      })
    })
    return children
  }

  return [
    { id: 0, label: 'Dashboard', link: '/', icon: <DashboardIcon /> },
    { id: 1, type: 'divider' },
    {
      id: 2,
      label: 'Assignments',
      link: '/assignments',
      icon: <AssignmentIcon />,
      children: mapStructure(assignmentStructure, '/assignments'),
    },
    {
      id: 3,
      label: 'Practice',
      link: '/practice',
      icon: <SchoolIcon />,
      children: mapStructure(practiceStructure, '/practice'),
    },
    { id: 4, label: 'Grades', link: '/grades', icon: <GradeIcon /> },
    { id: 5, label: 'Contact', link: '/contact', icon: <MessageIcon /> },
    { id: 6, label: 'Settings', link: '/settings', icon: <SettingsIcon /> },
  ]
}

export default generateSidebarStructure()
