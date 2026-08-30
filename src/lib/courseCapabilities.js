import { DEFAULT_LOGIC_SYSTEM, normalizeLogicSystem } from './logicSystems.js'

/*
purpose defines course scoped feature availability
contract the textbook is available only to fitch courses
invariant a missing course exposes no textbook
error behavior unknown logic systems expose no textbook
*/
export function courseHasTextbook(course) {
  if (!course) return false
  const rawLogicSystem = course.logicSystem ?? course.logic_system
  const logicSystem = rawLogicSystem == null
    ? DEFAULT_LOGIC_SYSTEM
    : normalizeLogicSystem(rawLogicSystem, null)
  return logicSystem === 'fitch'
}
