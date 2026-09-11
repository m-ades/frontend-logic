// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////// checkers/formula-truth-table.js ///////////////////////
// determines if a truth-table answer for a single formula is correct //
////////////////////////////////////////////////////////////////////////

import { fullTableMatch, hasSingleRowHighlight } from './truth-tables.js';
import { gradeComponents } from '../component-grading.js';

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

function hasMainOperatorHighlight(givenans, opspot) {
    const highlights = Array.isArray(givenans?.right?.colhls) ? givenans.right.colhls : [];
    return highlights.length > opspot
        && highlights[opspot] === true
        && highlights.filter((highlight) => highlight === true).length === 1;
}

// classifies the submitted main operator cells
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

/*
grades the table and each enabled classification or highlight as equal components
classification may follow the submitted table but highlights use the answer key
missing submission data fails its component and detailed feedback requires cheat
*/
export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    const givenRows = givenans?.right?.rows;
    const shapeIsValid = Array.isArray(givenRows) && Array.isArray(answer?.rows);
    const tmResult = shapeIsValid
        ? fullTableMatch(answer.rows, givenRows)
        : { offcells: [], rowdiff: 0, numchecked: 0 };
    const tableCorrect = shapeIsValid && tmResult.offcells.length === 0 && tmResult.rowdiff === 0;
    const componentScores = [tableCorrect ? 1 : 0];
    let qright = false;
    if (options.question) {
        const selection = normalizeSelection(givenans);
        const expected = correctSelection(answer);
        qright = sameSelection(selection, expected);
        if (!qright && shapeIsValid) {
            const theyshouldthink = shouldBe(givenRows, answer.opspot);
            if (theyshouldthink.comp) {
                const derived = correctSelection(theyshouldthink);
                qright = sameSelection(selection, derived);
            }
        }
        componentScores.push(qright ? 1 : 0);
    }
    if (options.highlightMainOperator) {
        componentScores.push(hasMainOperatorHighlight(givenans, answer.opspot) ? 1 : 0);
    }
    if (options.highlightWitnessRow) {
        const witnessRight = hasSingleRowHighlight(
            givenans, (i) => Array.isArray(answer?.rows) && answer.rows[i]?.[answer.opspot] === true
        );
        componentScores.push(witnessRight ? 1 : 0);
    }
    const rv = gradeComponents(componentScores, partialcredit, points);
    // include detailed feedback only when requested
    if (cheat && rv.successstatus !== 'correct') {
        rv.offcells = tmResult.offcells;
        if (options.question) {
            rv.qright = qright;
        }
        rv.rowdiff = tmResult.rowdiff;
    }
    return rv;
}
