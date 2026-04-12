import { createContext, useContext } from 'react'

const AppRuntimeContext = createContext(null)

export function AppRuntimeProvider({ value, children }) {
  return (
    <AppRuntimeContext.Provider value={value}>
      {children}
    </AppRuntimeContext.Provider>
  )
}

export function useAppRuntimeContext() {
  const context = useContext(AppRuntimeContext)
  if (!context) {
    throw new Error('useAppRuntime must be used within an AppRuntimeProvider')
  }
  return context
}
