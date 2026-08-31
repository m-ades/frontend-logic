import {
  DEFAULT_LOGIC_SYSTEM,
  normalizeLogicSystem,
} from '@/lib/logicSystems.js'

/*
purpose defines which course logic system may expose textbook content
contract missing and invalid values use the shared default logic system
*/
export function isTextbookAvailable(logicSystem) {
  return normalizeLogicSystem(logicSystem, DEFAULT_LOGIC_SYSTEM) === DEFAULT_LOGIC_SYSTEM
}
