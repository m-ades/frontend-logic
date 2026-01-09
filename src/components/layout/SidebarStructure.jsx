import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { API_CONFIG, fetchJson } from '../../utils/api.js'

const studentStructure = [
  { id: 0, label: 'Dashboard', link: '/', icon: <DashboardIcon /> },
  { id: 1, type: 'divider' },
  { id: 2, label: 'Assignments', link: '/assignments', icon: <AssignmentIcon />, children: [] },
  { id: 3, label: 'Practice', link: '/practice', icon: <SchoolIcon />, children: [] },
  { id: 4, label: 'Grades', link: '/grades', icon: <GradeIcon /> },
  { id: 5, label: 'Contact', link: '/contact', icon: <MessageIcon /> },
  { id: 6, label: 'Settings', link: '/settings', icon: <SettingsIcon /> },
]

const instructorStructure = [
  { id: 0, label: 'Dashboard', link: '/instructor/dashboard', icon: <DashboardIcon /> },
  { id: 1, type: 'divider' },
  { id: 2, label: 'Assignments', link: '/assignments', icon: <AssignmentIcon />, children: [] },
  { id: 3, label: 'Practice', link: '/practice', icon: <SchoolIcon />, children: [] },
  { id: 4, label: 'Gradebook', link: '/instructor/gradebook', icon: <GradeIcon /> },
  { id: 5, label: 'Controls', link: '/instructor/controls', icon: <AdminPanelSettingsIcon /> },
  { id: 6, label: 'Contact', link: '/contact', icon: <MessageIcon /> },
  { id: 7, label: 'Settings', link: '/settings', icon: <SettingsIcon /> },
]

const buildCourseStructure = (assignments) => {
  const chapters = new Map()
  assignments.forEach((assignment) => {
    const chapterLabel = assignment.chapter ? `Chapter ${assignment.chapter}` : 'Other'
    const subLabel = assignment.subchapter || 'All'
    const chapterEntry = chapters.get(chapterLabel) || new Map()
    const items = chapterEntry.get(subLabel) || []
    items.push({
      id: assignment.id,
      title: assignment.title,
      worksheet: { id: assignment.id },
    })
    chapterEntry.set(subLabel, items)
    chapters.set(chapterLabel, chapterEntry)
  })

  return Array.from(chapters.entries()).map(([chapterLabel, subMap]) => ({
    id: chapterLabel,
    title: chapterLabel,
    subchapters: Array.from(subMap.entries()).map(([subLabel, items]) => ({
      id: `${chapterLabel}-${subLabel}`,
      title: subLabel,
      activities: items,
    })),
  }))
}

const mapStructure = (structure, baseLink) => {
  return structure.map((chapter) => ({
    label: chapter.title,
    children: (chapter.subchapters || []).map((subchapter) => ({
      label: subchapter.title,
      children: (subchapter.activities || []).map((activity) => ({
        label: activity.title,
        link: activity.worksheet ? `/assignment/${activity.worksheet.id}` : baseLink,
      })),
    })),
  }))
}

export function useSidebarStructure() {
  const [assignmentStructure, setAssignmentStructure] = useState([])
  const [practiceStructure, setPracticeStructure] = useState([])
  const [isInstructor, setIsInstructor] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadAssignments = async () => {
      try {
        const assignments = await fetchJson(`/api/courses/${API_CONFIG.courseId}/assignments`)
        if (!isMounted) return
        setAssignmentStructure(
          buildCourseStructure(assignments.filter((assignment) => assignment.kind !== 'practice'))
        )
        setPracticeStructure(
          buildCourseStructure(assignments.filter((assignment) => assignment.kind === 'practice'))
        )
      } catch (error) {
        if (isMounted) {
          setAssignmentStructure([])
          setPracticeStructure([])
        }
      }
    }

    loadAssignments()
    const loadRole = async () => {
      try {
        const enrollments = await fetchJson('/api/course-enrollments')
        if (!isMounted) return
        const enrollment = (enrollments || []).find(
          (item) => Number(item.course_id) === Number(API_CONFIG.courseId)
        )
        setIsInstructor(Boolean(enrollment && ['instructor', 'ta'].includes(enrollment.role)))
      } catch (error) {
        if (isMounted) {
          setIsInstructor(false)
        }
      }
    }
    loadRole()
    return () => {
      isMounted = false
    }
  }, [])

  return useMemo(() => {
    const structure = isInstructor ? instructorStructure : studentStructure
    return structure.map((item) => {
      if (item.id === 2) {
        return { ...item, children: mapStructure(assignmentStructure, '/assignments') }
      }
      if (item.id === 3) {
        return { ...item, children: mapStructure(practiceStructure, '/practice') }
      }
      return item
    })
  }, [assignmentStructure, practiceStructure, isInstructor])
}
