import { COURSE_STRUCTURE, ACTIVITY_TYPES } from './courseStructure.js'

function flattenActivities(filterFn = () => true) {
  const activities = []
  COURSE_STRUCTURE.forEach(chapter => {
    chapter.subchapters?.forEach(subchapter => {
      subchapter.activities?.forEach(activity => {
        const annotated = {
          ...activity,
          chapterTitle: chapter.title,
          subchapterTitle: subchapter.title
        }
        if (filterFn(annotated)) {
          activities.push(annotated)
        }
      })
    })
  })
  return activities
}

export function getPracticeActivities() {
  return flattenActivities(activity => activity.type === ACTIVITY_TYPES.PRACTICE)
}

export function getAssignmentActivities() {
  return flattenActivities(activity =>
    activity.type === ACTIVITY_TYPES.HOMEWORK ||
    activity.type === ACTIVITY_TYPES.QUIZ ||
    activity.type === ACTIVITY_TYPES.EXAM
  )
}

export function getGradedActivities() {
  return flattenActivities(activity => activity.countsTowardsGrade)
}

export function getCourseStructureByTypes(types = []) {
  if (!Array.isArray(types) || types.length === 0) return []
  return COURSE_STRUCTURE.map((chapter) => {
    const subchapters = (chapter.subchapters || [])
      .map((subchapter) => {
        const activities = (subchapter.activities || []).filter((activity) =>
          types.includes(activity.type)
        )
        return activities.length > 0 ? { ...subchapter, activities } : null
      })
      .filter(Boolean)
    return subchapters.length > 0 ? { ...chapter, subchapters } : null
  }).filter(Boolean)
}

export { ACTIVITY_TYPES }
