const compareTextWithNumbers = (a, b) =>
  String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });

export const compareSubchapterLabels = (aLabel, bLabel) =>
  compareTextWithNumbers(aLabel, bLabel);

export const sortAssignmentsBySubchapter = (assignments) =>
  (assignments ? [...assignments] : []).sort((a, b) =>
    compareTextWithNumbers(
      a?.subchapter ?? a?.name ?? a?.title ?? '',
      b?.subchapter ?? b?.name ?? b?.title ?? ''
    )
  );
