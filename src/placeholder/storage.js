// remove when completion status and scores come from the backend

export function getStoredBoolean(key, defaultValue = false) {
  try {
    const saved = localStorage.getItem(key)
    return saved === 'true'
  } catch {
    return defaultValue
  }
}

export function getStoredNumber(key) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? parseFloat(saved) : null
  } catch {
    return null
  }
}
