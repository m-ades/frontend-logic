export const rowsEqual = (left = [], right = []) => {
  if (left === right) return true
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

export const matrixEqual = (left = [], right = []) => {
  if (left === right) return true
  if (left.length !== right.length) return false
  for (let r = 0; r < left.length; r += 1) {
    const leftRow = left[r] || []
    const rightRow = right[r] || []
    if (!rowsEqual(leftRow, rightRow)) return false
  }
  return true
}

export const tablesEqual = (left = [], right = []) => {
  if (left === right) return true
  if (left.length !== right.length) return false
  for (let t = 0; t < left.length; t += 1) {
    const leftRows = left[t] || []
    const rightRows = right[t] || []
    if (leftRows.length !== rightRows.length) return false
    for (let r = 0; r < leftRows.length; r += 1) {
      const leftRow = leftRows[r] || []
      const rightRow = rightRows[r] || []
      if (!rowsEqual(leftRow, rightRow)) return false
    }
  }
  return true
}

export const clearDebounce = (timerRef) => {
  if (!timerRef?.current) return
  clearTimeout(timerRef.current)
  timerRef.current = null
}

export const scheduleDebouncedChange = (timerRef, callback, nextState, delay = 150) => {
  if (!callback) return
  clearDebounce(timerRef)
  timerRef.current = setTimeout(() => {
    timerRef.current = null
    callback(nextState)
  }, delay)
}
