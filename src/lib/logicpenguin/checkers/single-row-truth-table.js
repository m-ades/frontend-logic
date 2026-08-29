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
    const expectedTv = answer?.tv;
    const givenRow = Array.isArray(givenans?.row) ? givenans.row : [];
    const givenTv = ("compound" in (givenans || {})) ? givenans.compound : null;

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

    let compoundScore = 0;
    if (givenTv !== null && typeof expectedTv !== 'undefined') {
        if (normalizeCell(givenTv) !== expectedTv) {
            correct = false;
        } else {
            compoundScore = 1;
        }
    } else if (typeof expectedTv !== 'undefined') {
        correct = false;
    }

    const earnedScores = typeof expectedTv !== 'undefined'
        ? [rowScore, compoundScore]
        : [rowScore];
    const componentScores = partialcredit || correct
        ? earnedScores
        : earnedScores.map(() => 0);
    const earned = partialcredit
        ? Math.floor(points * (earnedScores.reduce((sum, score) => sum + score, 0) / earnedScores.length))
        : (correct ? points : 0);
    const rv = {
        successstatus: correct ? "correct" : (earned > 0 ? "partial" : "incorrect"),
        points: earned,
        componentScores,
    };

    if (cheat && offcells.length > 0) {
        rv.offcells = offcells;
    }

    return rv;
}
