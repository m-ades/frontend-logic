////////////// checkers/single-row-truth-table.js ///////////////////////
// checks a single-row truth table (atoms given) for a formula         //
/////////////////////////////////////////////////////////////////////////

function normalizeCell(value) {
    if (value === true || value === false) {
        return value;
    }
    if (value === 1 || value === '1' || value === 'T' || value === 't') {
        return true;
    }
    if (value === 0 || value === '0' || value === 'F' || value === 'f') {
        return false;
    }
    return null;
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    const expectedRow = answer?.row || [];
    const givenRow = Array.isArray(givenans?.row) ? givenans.row : [];

    let correct = true;
    const offcells = [];
    let rowScore = 0;

    if (givenRow.length !== expectedRow.length) {
        correct = false;
        for (let i = 0; i < expectedRow.length; i++) {
            offcells.push(i);
        }
        rowScore = 0;
    } else {
        let correctCells = 0;
        for (let i = 0; i < expectedRow.length; i++) {
            const normalized = normalizeCell(givenRow[i]);
            if (normalized === null || normalized !== expectedRow[i]) {
                correct = false;
                offcells.push(i);
            } else {
                correctCells += 1;
            }
        }
        rowScore = expectedRow.length > 0
            ? (correctCells === expectedRow.length ? 1 : 0)
            : 0;
    }

    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: (correct ? points : 0),
        componentScores: [rowScore],
    };

    if (cheat && offcells.length > 0) {
        rv.offcells = offcells;
    }

    return rv;
}
