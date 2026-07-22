import { useCallback, useMemo, useState } from 'react'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import {
  clearCourseLinkOverrides,
  getCourseLinkDefinitions,
  normalizeLink,
  readCourseLinkOverrides,
  resolveTextbookPracticeLinks,
  writeCourseLinkOverrides,
} from '@/components/textbook/textbookPracticeLinks.js'

/**
 * Course-scoped textbook ↔ practice links with local/session persistence.
 * Falls back to seeded templates until the instructor saves overrides.
 */
export function useTextbookPracticeLinks() {
  const runtime = useAppRuntime()
  const storageScope = runtime?.storageScope === 'session' ? 'session' : 'local'
  const courseId = runtime?.courseState?.activeCourseId ?? runtime?.activeCourseId ?? null

  const practices = useMemo(() => {
    const fromState = runtime?.courseState?.practicesByCourse?.[courseId]
    if (Array.isArray(fromState)) return fromState
    if (Array.isArray(runtime?.practices)) return runtime.practices
    if (Array.isArray(runtime?.sandbox?.practices)) return runtime.sandbox.practices
    return []
  }, [runtime, courseId])

  const [revision, setRevision] = useState(0)

  const definitions = useMemo(() => {
    void revision
    return getCourseLinkDefinitions(courseId, storageScope)
  }, [courseId, storageScope, revision])

  const resolvedLinks = useMemo(
    () => resolveTextbookPracticeLinks(definitions, practices),
    [definitions, practices],
  )

  const hasOverrides = useMemo(() => {
    void revision
    return readCourseLinkOverrides(courseId, storageScope) != null
  }, [courseId, storageScope, revision])

  const saveLinks = useCallback(
    (nextLinks) => {
      const normalized = (nextLinks || []).map(normalizeLink)
      writeCourseLinkOverrides(courseId, normalized, storageScope)
      setRevision((value) => value + 1)
      return normalized
    },
    [courseId, storageScope],
  )

  const resetToDefaults = useCallback(() => {
    clearCourseLinkOverrides(courseId, storageScope)
    setRevision((value) => value + 1)
  }, [courseId, storageScope])

  return {
    courseId,
    storageScope,
    practices,
    definitions,
    resolvedLinks,
    hasOverrides,
    saveLinks,
    resetToDefaults,
    usingDefaults: !hasOverrides,
  }
}
