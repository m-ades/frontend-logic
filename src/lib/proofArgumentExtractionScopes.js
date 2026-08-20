// assumptionScopes indexes question.lines, excluding premises. Each range is
// one subproof: its start requires AS, and every line through its end is inside
// that scope. Ranges may be disjoint or nested, but may not cross.
export function parseAssumptionScopes(value, lineCount) {
  if (value == null) return { scopes: [], error: '' };
  if (!Array.isArray(value)) {
    return { scopes: [], error: 'Assumption scopes must be an array.' };
  }

  const scopes = value.map((scope) => ({
    start: scope?.start,
    end: scope?.end,
  }));
  for (const { start, end } of scopes) {
    if (!Number.isInteger(start) || !Number.isInteger(end)
      || start < 0 || end < start || end >= lineCount) {
      return { scopes: [], error: 'Each assumption scope must contain valid start and end line indexes.' };
    }
  }

  scopes.sort((left, right) => left.start - right.start || right.end - left.end);
  const openScopes = [];
  for (const scope of scopes) {
    while (openScopes.length && scope.start > openScopes.at(-1).end) {
      openScopes.pop();
    }
    const parent = openScopes.at(-1);
    if (parent?.start === scope.start) {
      return { scopes: [], error: 'Two assumption scopes cannot start on the same line.' };
    }
    if (parent && scope.end > parent.end) {
      return { scopes: [], error: 'Assumption scopes may be nested, but they cannot cross.' };
    }
    openScopes.push(scope);
  }
  return { scopes, error: '' };
}

export function getAssumptionDepths(scopes, lineCount) {
  const changes = Array(lineCount + 1).fill(0);
  for (const { start, end } of scopes) {
    changes[start] += 1;
    changes[end + 1] -= 1;
  }
  let depth = 0;
  return Array.from({ length: lineCount }, (_, index) => {
    depth += changes[index];
    return depth;
  });
}
