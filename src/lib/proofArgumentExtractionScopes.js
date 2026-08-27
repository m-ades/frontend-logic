// assumptionScopes indexes question.lines, excluding premises. Parsing returns
// sorted ranges or an empty list plus an author-facing error. Each valid range
// is one subproof: start through end is inside, and the final conclusion stays
// outside every range. Ranges may be disjoint or nested but not cross. Fitch
// opens with AS. Hurley opens with ACP/AIP and closes on the line after end; each
// opening and closing must occupy its own line. Requirements assume parsed ranges.
export function getAssumptionRuleRequirements(scopes, logicSystem) {
  const opening = logicSystem === 'hurley' ? ['ACP', 'AIP'] : ['AS'];
  const closing = logicSystem === 'hurley' ? ['CP', 'IP'] : [];
  return scopes.flatMap(({ start, end }) => [
    { line: start, kind: 'opening', rules: opening },
    ...(closing.length ? [{ line: end + 1, kind: 'closing', rules: closing }] : []),
  ]);
}

export function getJustificationRule(value) {
  const pieces = String(value ?? '').trim().split(/[, \u2009]+/).filter(Boolean);
  const rule = pieces.find((piece) => !/^[0-9?]+(?:[-–—−][0-9?]+)?$/.test(piece));
  return rule?.toUpperCase() ?? '';
}

export function parseAssumptionScopes(value, lineCount, logicSystem) {
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
    if (end === lineCount - 1) {
      return { scopes: [], error: 'An assumption scope must end before the conclusion line.' };
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
  if (logicSystem === 'hurley') {
    const requirementLines = new Set();
    for (const { line } of getAssumptionRuleRequirements(scopes, logicSystem)) {
      if (requirementLines.has(line)) {
        return { scopes: [], error: 'Each Hurley assumption scope must have its own opening and closing lines.' };
      }
      requirementLines.add(line);
    }
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
