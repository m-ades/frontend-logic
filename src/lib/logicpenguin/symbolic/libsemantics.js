// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////////////libsemantics.js//////////////////////////////////
// calculates truth values based on truth functions, completes        //
// truth tables and similar                                           //
////////////////////////////////////////////////////////////////////////

import getSyntax from './libsyntax.js';
import { arrayUnion } from '../misc.js';

export const libtf = {};

// truth functions of classical logic
libtf.tfns = {
    OR     : (a,b) => (a || b),
    AND    : (a,b) => (a && b),
    IFTHEN : (a,b) => (!a || b),
    IFF    : (a,b) => (a == b),
    NOT    : (a)   => (!a),
    FALSUM : ()    => (false)
}

// get all interpretations/truth-value assignments
libtf.allinterps = function(wffs) {
    // start with an empty interpretation
    let interps = [{}];
    let previnterps = [];
    let allpletters = [];
    for (let wff of wffs) {
        allpletters = arrayUnion(allpletters, wff.allpletters);
    }
    // loop over letters in wff
    for (let pletter of allpletters) {
        // for each old interpretation, create two new ones
        // one where this letter is true and one where it is false
        previnterps = interps;
        interps = [];
        for ( let interp of previnterps ) {
            interps.push(
                { ...interp, [pletter]: true },
                { ...interp, [pletter]: false }
            );
        }
    }
    return interps;
}

function evaluateFormula(wff, interp, syntax, includeTokens) {
    const tfn = (wff.op) ? libtf.tfns[syntax.operators[wff.op]] : false;
    if (syntax.isbinaryop(wff.op)) {
        const lres = evaluateFormula(wff.left, interp, syntax, includeTokens);
        const rres = evaluateFormula(wff.right, interp, syntax, includeTokens);
        const tv = tfn(lres.tv, rres.tv);
        const result = {
            tv: tv,
            row: [...lres.row, tv, ...rres.row],
            opspot: lres.row.length
        };
        if (includeTokens) {
            result.tokens = [...lres.tokens, wff.op, ...rres.tokens];
        }
        return result;
    }
    if (syntax.ismonop(wff.op)) {
        const rres = evaluateFormula(wff.right, interp, syntax, includeTokens);
        const tv = tfn(rres.tv);
        const result = { tv: tv, row: [tv, ...rres.row], opspot: 0 };
        if (includeTokens) {
            result.tokens = [wff.op, ...rres.tokens];
        }
        return result;
    }
    const tv = tfn ? tfn() : (interp[wff.pletter] ?? false);
    const result = { tv: tv, row: [tv], opspot: 0 };
    if (includeTokens) {
        result.tokens = [wff.normal];
    }
    return result;
}

libtf.evaluate = function(wff, interp, notation = undefined) {
    return evaluateFormula(wff, interp, getSyntax(notation), false);
}

// returns aligned tokens row values and main operator position for one interpretation
export function evaluateWithTokens(wff, interp, notation = undefined) {
    return evaluateFormula(wff, interp, getSyntax(notation), true);
}

// fills in a truth table for one formula and determines if it
// is a contradiction or tautology
export function formulaTable(fml, notation = undefined) {
    const interps = libtf.allinterps([fml]);
    let taut = true;
    let contra = true;
    let opspot = 0;
    const rows = interps.map( (interp) => {
        const e = libtf.evaluate(fml, interp, notation);
        if (e.tv) { contra = false; } else { taut = false; }
        opspot = e.opspot;
        return e.row;
    }) ;
    return { taut, contra, opspot, rows };
}

// fills shared truth tables and checks mutual equivalence
export function equivTablesMany(wffs, notation = undefined) {
    const interps = libtf.allinterps(wffs);
    let equiv = wffs.length >= 2;
    const tables = wffs.map(() => ({ opspot: 0, rows: [] }));
    for (const interp of interps) {
        const values = wffs.map((wff, index) => {
            const result = libtf.evaluate(wff, interp, notation);
            tables[index].opspot = result.opspot;
            tables[index].rows.push(result.row);
            return result.tv;
        });
        equiv = equiv && values.every((value) => value === values[0]);
    }
    return { equiv, tables }
}

// preserves the pairwise logicpenguin interface
export function equivTables(fmlA, fmlB, notation = undefined) {
    const { equiv, tables } = equivTablesMany([fmlA, fmlB], notation);
    const [A, B] = tables;
    return { equiv, A, B }
}

// fills in the truth tables for the premises and conclusion of
// an argument and determines its validity
export function argumentTables(pwffs, cwff, notation = undefined) {

    const interps = libtf.allinterps([...pwffs,cwff]);
    let valid = true;
    const prems = [];
    for (const pr of pwffs) {
        prems.push({ opspot:0, rows: [] });
    }
    const conc = {};
    conc.rows = [];
    conc.opspot = 0;
    for (const interp of interps) {
        let allpremstrue = true;
        for (let i=0; i < pwffs.length; i++) {
            const w = pwffs[i];
            const e = libtf.evaluate(w, interp, notation);
            prems[i].opspot = e.opspot;
            prems[i].rows.push(e.row);
            allpremstrue = (allpremstrue && e.tv);
        }
        const ce = libtf.evaluate(cwff, interp, notation);
        conc.opspot = ce.opspot;
        conc.rows.push(ce.row);
        valid = (valid && (!allpremstrue || ce.tv));
    }
    return { valid, prems, conc }
}

// fills in truth tables for multiple formulas using shared interpretations
// returns rows per subformula column (atoms first, then derived, then main)
export function multiTables(wffs, notation = undefined) {
    const interps = libtf.allinterps(wffs);
    const tables = [];

    for (const wff of wffs) {
        let tokens = [];
        const rows = [];
        for (const interp of interps) {
            const res = evaluateWithTokens(wff, interp, notation);
            if (tokens.length === 0) { tokens = res.tokens; }
            rows.push(res.row);
        }
        tables.push({ tokens, rows });
    }

    return { tables };
}

// determines truth tables for a problem in which the student
// did their own translations and determines validity
export function comboTables(wffs, index, notation = undefined) {
    const tables = [];
    const interps = libtf.allinterps(wffs);
    let valid = true;
    for (let i=0; i<wffs.length; i++) {
        tables.push({ rows:[], opspot: 0 });
    }
    for (let interp of interps) {
        let allpremstrue = true;
        let conctrue = false;
        for (let i=0; i<wffs.length; i++) {
            const wff=wffs[i];
            const e = libtf.evaluate(wff, interp, notation);
            tables[i].opspot = e.opspot;
            tables[i].rows.push(e.row);
            if (i==index) { // conclusion
                conctrue = e.tv;
            } else { //premise
                allpremstrue = (allpremstrue && e.tv);
            }
        }
        valid = (valid && (!allpremstrue || conctrue));
    }
    return [tables, valid];
}
