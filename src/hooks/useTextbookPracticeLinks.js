import { useMemo } from 'react'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { createCourseScopedTextbookResource } from '@/hooks/useCourseScopedTextbookResource.js'
import {
  clearCourseLinkOverrides,
  DEFAULT_LINK_TEMPLATES,
  normalizeLink,
  readCourseLinkOverrides,
  resolveTextbookPracticeLinks,
  writeCourseLinkOverrides,
} from '@/components/textbook/textbookPracticeLinks.js'

const usePracticeLinksResource = createCourseScopedTextbookResource({
  resourceName: 'textbook-practice-links',
  responseField: 'links',
  normalize: normalizeLink,
  readOverrides: readCourseLinkOverrides,
  writeOverrides: writeCourseLinkOverrides,
  clearOverrides: clearCourseLinkOverrides,
  getDefaults: () => DEFAULT_LINK_TEMPLATES,
})

/**
 * Course-scoped textbook ↔ practice links.
 * Live mode uses the API; sandbox keeps sessionStorage.
 */
export function useTextbookPracticeLinks() {
  const runtime = useAppRuntime()
  const {
    courseId,
    storageScope,
    isSandbox,
    isLoading,
    isError,
    values: definitions,
    hasOverrides,
    usingDefaults,
    save: saveLinks,
    reset: resetToDefaults,
  } = usePracticeLinksResource()

  const practices = useMemo(() => {
    const fromState = runtime?.courseState?.practicesByCourse?.[courseId]
    if (Array.isArray(fromState)) return fromState
    if (Array.isArray(runtime?.practices)) return runtime.practices
    if (Array.isArray(runtime?.sandbox?.practices)) return runtime.sandbox.practices
    return []
  }, [runtime, courseId])

  const resolvedLinks = useMemo(
    () => resolveTextbookPracticeLinks(definitions, practices),
    [definitions, practices],
  )

  return {
    courseId,
    storageScope,
    isSandbox,
    isLoading,
    isError,
    practices,
    definitions,
    resolvedLinks,
    hasOverrides,
    saveLinks,
    resetToDefaults,
    usingDefaults,
  }
}
