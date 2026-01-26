import { createContext, useContext } from 'react'

export const ProblemNavigationContext = createContext(null)

export const useProblemNavigation = () => useContext(ProblemNavigationContext)
