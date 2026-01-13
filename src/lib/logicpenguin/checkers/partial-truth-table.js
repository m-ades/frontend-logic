// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////// checkers/partial-truth-table.js ///////////////////////
// checks partial truth table rows with T/F/U answers                 //
////////////////////////////////////////////////////////////////////////

import getFormulaClass from '../symbolic/formula.js';
import { multiTables } from '../symbolic/libsemantics.js';

function toTruth(value) {
    if (value === true || value === 'T' || value === 't' || value === 1) {
        return true;
    }
    if (value === false || value === 'F' || value === 'f' || value === 0) {
        return false;
    }
    return null;
}

function toSymbol(value) {
    if (value === true || value === 'T' || value === 't') { return 'T'; }
    if (value === false || value === 'F' || value === 'f') { return 'F'; }
    if (value === 'U' || value === 'u' || value === '?') { return 'U'; }
    return '';
}

function computeExpected(question, options) {
    const statement = question?.statement || question?.formula || '';
    const row = Array.isArray(question?.row) ? question.row : [];
    if (!statement) {
        return { expected: [], unknownIndices: [] };
    }
    const Formula = getFormulaClass(options?.notation);
    const wff = Formula.from(statement);
    const tables = multiTables([wff]);
    const tokens = tables?.tables?.[0]?.tokens ?? [];
    const rows = tables?.tables?.[0]?.rows ?? [];

    const unknownIndices = [];
    const known = [];
    for (let i = 0; i < tokens.length; i++) {
        const cell = row[i];
        const tv = toTruth(cell);
        if (tv === null) {
            unknownIndices.push(i);
        } else {
            known.push([i, tv]);
        }
    }

    const matching = rows.filter((r) =>
        known.every(([idx, tv]) => r?.[idx] === tv)
    );

    const expected = Array(tokens.length).fill('U');
    for (const idx of unknownIndices) {
        let hasTrue = false;
        let hasFalse = false;
        for (const r of matching) {
            if (r?.[idx] === true) { hasTrue = true; }
            if (r?.[idx] === false) { hasFalse = true; }
        }
        if (hasTrue && !hasFalse) { expected[idx] = 'T'; }
        if (!hasTrue && hasFalse) { expected[idx] = 'F'; }
        if (!hasTrue && !hasFalse) { expected[idx] = 'U'; }
        if (hasTrue && hasFalse) { expected[idx] = 'U'; }
    }

    return { expected, unknownIndices };
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    const { expected, unknownIndices } = computeExpected(question, options);
    const givenRow = Array.isArray(givenans?.row) ? givenans.row : [];

    let correctCount = 0;
    const wrongIndices = [];
    for (const idx of unknownIndices) {
        const expectedVal = expected[idx];
        const givenVal = toSymbol(givenRow[idx]);
        if (expectedVal === givenVal) {
            correctCount++;
        } else {
            wrongIndices.push(idx);
        }
    }

    const total = unknownIndices.length;
    const correct = (total === 0) ? true : (correctCount === total);
    const score = total > 0 ? (correctCount / total) : 1;
    const awarded = partialcredit ? Math.floor(points * score) : (correct ? points : 0);

    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: awarded,
        componentScores: [score]
    };

    if (cheat && wrongIndices.length > 0) {
        rv.offcells = wrongIndices;
    }

    return rv;
}
