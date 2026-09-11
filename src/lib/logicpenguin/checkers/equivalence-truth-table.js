// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// checkers/equivalence-truth-table.js ///////////////
// Determines if an equivalence truth table answer is correct        //
///////////////////////////////////////////////////////////////////////

import { fullTableMatch, hasSingleRowHighlight, allTrueAtRow } from './truth-tables.js';
import { gradeComponents } from '../component-grading.js';

function normalizeSelection(givenans) {
    if (Array.isArray(givenans?.mcans)) {
        return new Set(givenans.mcans.map((v) => String(v)));
    }
    if (givenans?.mcans === 0) { return new Set(['equivalent']); }
    if (givenans?.mcans === 1) { return new Set(['not-equivalent']); }
    if (givenans?.equiv === true) { return new Set(['equivalent']); }
    if (givenans?.equiv === false) { return new Set(['not-equivalent']); }
    return new Set();
}

function sameSelection(a, b) {
    if (a.size !== b.size) { return false; }
    for (const v of a) {
        if (!b.has(v)) { return false; }
    }
    return true;
}

function truthValue(value) {
    if (value === true || value === 1 || value === '1' || value === 'T' || value === 't') {
        return true;
    }
    if (value === false || value === 0 || value === '0' || value === 'F' || value === 'f') {
        return false;
    }
    return null;
}

// classifies consistency across every table and equivalence only for a pair
function relationSet(tables) {
    let comp = tables.length >= 2 && tables[0].rows.length > 0;
    let equiv = comp;
    let consistent = false;
    const rowCount = tables[0]?.rows?.length ?? 0;
    if (tables.some((table) => table.rows.length !== rowCount)) {
        comp = false;
        equiv = false;
    }
    for (let i = 0 ; comp && i < rowCount ; i++) {
        const values = tables.map((table) => truthValue(table.rows[i]?.[table.opspot]));
        if (values.some((value) => value === null)) {
            comp = false;
            equiv = false;
            break;
        }
        if (!values.every((value) => value === values[0])) {
            equiv = false;
        }
        if (values.every(Boolean)) {
            consistent = true;
        }
    }
    const inconsistent = comp ? !consistent : false;
    const labels = new Set();
    if (equiv && tables.length === 2) { labels.add('equivalent'); }
    if (comp) {
        if (consistent) { labels.add('consistent'); }
        if (inconsistent) { labels.add('inconsistent'); }
    }
    return { labels, comp };
}

/*
grades semantic table sets or legacy pairs with equal component credit
classification checks consistency and pair equivalence and witnesses use the answer key
missing submissions fail their components and detailed feedback requires cheat
*/
export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    // check table portion
    const answerTables = Array.isArray(answer?.tables)
        ? answer.tables
        : [answer?.A, answer?.B].filter(Boolean);
    const givenTables = [
        ...(Array.isArray(givenans?.lefts) ? givenans.lefts : []),
        ...(givenans?.right ? [givenans.right] : [])
    ];
    const tableMatches = answerTables.map((table, index) =>
        fullTableMatch(table.rows, givenTables[index]?.rows ?? [])
    );
    const tableFullyCorrect = givenTables.length === answerTables.length &&
        tableMatches.every((result) =>
            result.rowdiff === 0 && result.offcells.length === 0
        );
    const componentScores = [tableFullyCorrect ? 1 : 0];
    let qright = false;
    const opts = options || {};
    if (opts.question) {
        const selection = normalizeSelection(givenans);
        const expected = relationSet(answerTables);
        qright = sameSelection(selection, expected.labels);
        if (!qright) {
            if (givenTables.length === answerTables.length) {
                const derived = relationSet(answerTables.map((table, index) => ({
                    opspot: table.opspot,
                    rows: givenTables[index].rows,
                })));
                if (derived.comp) {
                    qright = sameSelection(selection, derived.labels);
                }
            }
        }
        componentScores.push(qright ? 1 : 0);
    }
    if (opts.highlightWitnessRow) {
        // an empty statement set has no witness row
        const isValidWitness = (i) => answerTables.length > 0 && allTrueAtRow(answerTables, i);
        const witnessRight = hasSingleRowHighlight(givenans, isValidWitness);
        componentScores.push(witnessRight ? 1 : 0);
    }
    const rv = gradeComponents(componentScores, partialcredit, points);
    // include detailed feedback only when requested
    if (cheat && rv.successstatus !== 'correct') {
        rv.offcells = {
            tables: tableMatches.map((result) => result.offcells),
            A: tableMatches[0]?.offcells ?? [],
            B: tableMatches[1]?.offcells ?? []
        }
        if (opts.question) {
            rv.qright = qright;
        }
        rv.rowdiff = tableMatches[0]?.rowdiff ?? 0;
    }
    return rv;
}
