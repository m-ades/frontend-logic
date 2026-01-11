// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////// checkers/formula-truth-table.js ///////////////////////
// determines if a truth-table answer for a single formula is correct //
////////////////////////////////////////////////////////////////////////

import { fullTableMatch } from './truth-tables.js';

function normalizeSelection(givenans) {
    if (Array.isArray(givenans?.mcans)) {
        return new Set(givenans.mcans.map((v) => String(v)));
    }
    if (givenans?.mcans === 0) { return new Set(['tautology']); }
    if (givenans?.mcans === 1) { return new Set(['contingent']); }
    if (givenans?.mcans === 2) { return new Set(['self-contradiction']); }
    const selections = [];
    if (givenans?.taut) { selections.push('tautology'); }
    if (givenans?.contra) { selections.push('self-contradiction'); }
    if (!givenans?.taut && !givenans?.contra && givenans?.mcans === -1) {
        return new Set();
    }
    return new Set(selections.length ? selections : ['contingent']);
}

function correctSelection(answer) {
    if (answer.taut) { return new Set(['tautology']); }
    if (answer.contra) { return new Set(['self-contradiction']); }
    return new Set(['contingent']);
}

function sameSelection(a, b) {
    if (a.size !== b.size) { return false; }
    for (const v of a) {
        if (!b.has(v)) { return false; }
    }
    return true;
}

// tests whether they should think the statement is a tautology,
// self contradiction or contingent
function shouldBe(rows, opspot) {
    let taut = true;
    let contra = true;
    let comp = true;
    for (const r of rows) {
        if (r[opspot] === -1) {
            comp = false;
            taut = false;
            contra = false;
            break;
        }
        if (r[opspot] !== true) {
            taut = false;
        }
        if (r[opspot] !== false) {
            contra = false;
        }
    }
    return { taut, contra, comp };
}

// partial credit is based on 5 points for the table, and 2 additional
// points if there is a partial credit portion; these 2 points are
// awarded if the answer is either correct or would be correct if the
// table was right

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let correct = true;
    // check table portion
    let offive = 0;
    const tmResult = fullTableMatch(answer.rows, givenans.right.rows);
    if ((tmResult.offcells.length == 0) && (tmResult.rowdiff == 0)) {
        offive = 5;
    } else {
        correct = false;
        // todo? tweak this?
        const shouldachecked = (answer.rows.length * answer.rows[0].length);
        if (tmResult.numchecked > 0) {
            offive = (( tmResult.numchecked -
                tmResult.offcells.length ) / shouldachecked) * 4;
        }
        if (tmResult.rowdiff < 0) { offive--; }
        if (tmResult.rowdiff > 0) { offive = offive * (
            (answer.rows.length - tmResult.rowdiff )/ answer.rows.length);
        }
        if (offive < 0) { offive = 0 };
    }
    // check answer
    let qright = false;
    let awarded = 0;
    if (options.question) {
        const selection = normalizeSelection(givenans);
        const expected = correctSelection(answer);
        qright = sameSelection(selection, expected);
        if (!qright) {
            const theyshouldthink = shouldBe(givenans.right.rows, answer.opspot);
            if (theyshouldthink.comp) {
                const derived = correctSelection(theyshouldthink);
                qright = sameSelection(selection, derived);
            }
        }
        if (!qright) { correct = false; }
        if (partialcredit) {
            const tableScore = offive / 5;
            const mcScore = qright ? 1 : 0;
            awarded = Math.floor(points * (0.5 * tableScore + 0.5 * mcScore));
        } else {
            awarded = (correct) ? points : 0;
        }
    } else {
        if (partialcredit) {
            awarded = Math.floor((offive/5)*points);
        } else {
            awarded = (correct) ? points: 0;
        }
    }
    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: awarded
    }
    // only send off cells back to browser if they are allowed to 
    // cheat at this stage
    if (cheat && !correct) {
        rv.offcells = tmResult.offcells;
        if (options.question) {
            rv.qright = qright;
        }
        rv.rowdiff = tmResult.rowdiff;
    }
    return rv;
}
