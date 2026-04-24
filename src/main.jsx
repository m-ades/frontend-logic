import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './global.css'
import './lib/logicpenguin/stylesheets/common.css'

// fresh until stale then refetch
const STALE_TIME_MS = 5 * 60 * 1000   // 5m
const GC_TIME_MS = 15 * 60 * 1000     // unused cache 15m

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MS,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
