import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadRemoteTextbookCatalog } from '@/components/textbook/bookmlCatalog.js'
import {
  getBundledTextbookManifest,
  setActiveTextbookCatalog,
} from '@/components/textbook/textbookCatalog.js'
import { resolveTextbookSource } from '@/components/textbook/textbookSource.js'
import { useCourseTextbookSource } from '@/hooks/useCourseTextbookSource.js'

// A republished bundle should reach students without a redeploy, but not so
// eagerly that a chapter refetches its table of contents on every focus change.
const STALE_TIME_MS = 5 * 60 * 1000

/**
 * Install the catalog for the active textbook source.
 *
 * The bundled manifest stays in place until a remote catalog loads, and stays
 * in place if one never does, so a publishing outage degrades to the last
 * shipped table of contents instead of an empty book.
 */
export function useTextbookCatalog(sourceOverride = null) {
  // Precedence: an explicit argument, then this course's override, then the
  // deploy default, then the bundled copy.
  const { baseUrl: courseBaseUrl, isLoading: sourceLoading } = useCourseTextbookSource()
  const source = useMemo(
    () => resolveTextbookSource(sourceOverride ?? courseBaseUrl),
    [sourceOverride, courseBaseUrl],
  )

  const query = useQuery({
    queryKey: ['textbook-catalog', source.baseUrl],
    queryFn: async ({ signal }) => {
      const catalog = await loadRemoteTextbookCatalog(source.baseUrl, { signal })
      setActiveTextbookCatalog(catalog)
      return catalog
    },
    // Waiting for the course override avoids a fetch against the wrong bundle.
    enabled: source.isRemote && !sourceLoading,
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Re-assert on remount: the query may resolve from cache without running.
  useEffect(() => {
    if (query.data) setActiveTextbookCatalog(query.data)
  }, [query.data])

  const catalog = source.isRemote ? query.data : getBundledTextbookManifest()

  return {
    source,
    catalog: catalog || getBundledTextbookManifest(),
    usingFallback: source.isRemote && !query.data,
    isLoading: sourceLoading || (source.isRemote && query.isLoading),
    isReady: !sourceLoading && (!source.isRemote || !query.isLoading),
    isError: query.isError,
    error: query.error || null,
  }
}
