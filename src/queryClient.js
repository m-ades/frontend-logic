import { QueryClient } from '@tanstack/react-query'

// fresh until stale then refetch
const STALE_TIME_MS = 5 * 60 * 1000   // 5m
const GC_TIME_MS = 15 * 60 * 1000     // unused cache 15m

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MS,
    },
  },
})
