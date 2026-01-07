import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { API_CONFIG, fetchJson } from '../../utils/api.js'

const baseStructure = [
  { id: 0, label: 'Dashboard', link: '/', icon: <DashboardIcon /> },
  { id: 1, type: 'divider' },
  { id: 2, label: 'Assignments', link: '/assignments', icon: <AssignmentIcon />, children: [] },
  { id: 3, label: 'Practice', link: '/practice', icon: <SchoolIcon />, children: [] },
  { id: 4, label: 'Grades', link: '/grades', icon: <GradeIcon /> },
  { id: 5, label: 'Contact', link: '/contact', icon: <MessageIcon /> },
  { id: 6, label: 'Settings', link: '/settings', icon: <SettingsIcon /> },
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
    return () => {
      isMounted = false
    }
  }, [])

  return useMemo(() => {
    return baseStructure.map((item) => {
      if (item.id === 2) {
        return { ...item, children: mapStructure(assignmentStructure, '/assignments') }
      }
      if (item.id === 3) {
        return { ...item, children: mapStructure(practiceStructure, '/practice') }
      }
      return item
    })
  }, [assignmentStructure, practiceStructure])
}
