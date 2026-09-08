// deep merge. source overwrites. arrays replace.
export function deepMerge(target, source) {
  if (source == null) return target
  if (Array.isArray(source)) return source
  if (typeof source !== 'object') return source
  const existing = target != null && typeof target === 'object' && !Array.isArray(target) ? target : {}
  const out = { ...existing }
  for (const key of Object.keys(source)) {
    out[key] = deepMerge(out[key], source[key])
  }
  return out
}

// use same type key as existing snapshot to preserve shape
export function typeKey(existing) {
  const e = existing && typeof existing === 'object' ? existing : {}
  return e.logic_problem_type !== undefined ? 'logic_problem_type' : (e.type !== undefined ? 'type' : 'logic_problem_type')
}
