import { useAppRuntime } from './useAppRuntime.js'
import { DEFAULT_LOGIC_SYSTEM, normalizeLogicSystem } from '../lib/logicSystems.js'

export function useActiveLogicSystem() {
  const { courseState } = useAppRuntime()
  const activeCourse = courseState?.courses?.find(
    (course) => String(course.id) === String(courseState.activeCourseId),
  )
  return normalizeLogicSystem(activeCourse?.logicSystem ?? activeCourse?.logic_system, DEFAULT_LOGIC_SYSTEM)
}
