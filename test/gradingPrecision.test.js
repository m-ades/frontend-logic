import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNumber, roundNumber, numberOrNull } from '../src/utils/numberUtils.js';
import { calculateAverage, getStudentAverage, filterStudents } from '../src/utils/GradebookUtils.js';
import {
  calculateGradeDistribution,
  getDefaultGradingScale,
  getLetterGrade,
  getGradeColor,
  getGradeColorVariant,
  isPassingGrade,
} from '../src/utils/gradingUtils.js';
import { useWorksheetMetrics } from '../src/hooks/useWorksheetMetrics.js';

test('numbers use three decimal precision without trailing zeros', () => {
  for (const [input, expected] of [[89.3464, 89.346], [89.3466, 89.347], [89.9995, 90], [100 / 3, 33.333], [0, 0], ['89.9', 89.9]]) {
    assert.equal(roundNumber(input), expected);
    assert.equal(formatNumber(input), String(expected));
  }
  for (const input of [null, undefined, '', NaN, Infinity, 'invalid', false]) {
    assert.equal(roundNumber(input), null);
    assert.equal(formatNumber(input), '—');
  }
});

test('grade labels colors and distributions use unrounded boundaries', () => {
  const scale = getDefaultGradingScale().reverse();
  const before = structuredClone(scale);
  for (const [score, letter] of [[0, 'F'], [59.9994, 'F'], [59.9995, 'F'], [69.9, 'D'], [79.9, 'C'], [89.346, 'B'], [89.9, 'B'], [89.9994, 'B'], [89.9995, 'B'], [90, 'A'], [100, 'A']]) {
    assert.equal(getLetterGrade(score, scale), letter);
    assert.equal(getGradeColor(score, scale), scale.find(g => g.letter === letter).color);
    const distribution = calculateGradeDistribution([{ grades: { a: score } }], scale);
    assert.equal(distribution.find(g => g.count === 1).grade, letter);
    assert.equal(distribution.reduce((sum, g) => sum + g.count, 0), 1);
  }
  assert.equal(formatNumber(89.9995), '90');
  assert.equal(getLetterGrade(89.9995, scale), 'B');
  assert.equal(getGradeColorVariant(89.9995, scale), 'info');
  assert.equal(getGradeColorVariant(89.9, scale), 'info');
  assert.equal(isPassingGrade(59.9995, scale), false);
  assert.equal(isPassingGrade(59.9994, scale), false);
  assert.deepEqual(scale, before);
});

test('distribution respects supplied averages and missing work with default and custom scales', () => {
  const students = [
    { average: 89.9995, grades: { a: 0, b: 100 } },
    { average: null, grades: { a: 100 } },
    { grades: {} },
    { grades: { a: NaN, b: null } },
  ];
  const distribution = calculateGradeDistribution(students);
  assert.equal(distribution.find(g => g.grade === 'B').count, 1);
  assert.equal(distribution.reduce((sum, g) => sum + g.count, 0), 1);
  assert.deepEqual(calculateGradeDistribution(students, null), distribution);
  assert.deepEqual(calculateGradeDistribution(students, []), []);
  const custom = [{ letter: 'pass', minPercent: 82.5, maxPercent: 100 }, { letter: 'fail', minPercent: 0, maxPercent: 82 }];
  assert.equal(getLetterGrade(82.4995, custom), 'fail');
  assert.equal(getLetterGrade(82.4994, custom), 'fail');
});

test('averages and filters keep full precision while worksheet labels round', () => {
  assert.equal(calculateAverage({ a: '89.123', b: 89.569, c: null }), 89.346);
  assert.equal(calculateAverage({ a: 89.9994, b: 89.9996 }), (89.9994 + 89.9996) / 2);
  assert.equal(numberOrNull('89.9995'), 89.9995);
  assert.equal(calculateAverage({}), null);
  assert.equal(getStudentAverage({ average: 89.9995 }), 89.9995);
  const student = { username: 'student', grades: { a: 89.9995 } };
  assert.deepEqual(filterStudents([student], '', 'a', 'a'), []);
  assert.deepEqual(filterStudents([student], '', 'all', 'a'), []);
  const metrics = useWorksheetMetrics({ score: 1, total: 3, calculatedGradePercent: 89.3464 });
  assert.equal(metrics.completionPercent, 33.333);
  assert.equal(metrics.gradeLabel, '89.346%');
});
