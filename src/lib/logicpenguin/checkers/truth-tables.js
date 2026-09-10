// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// checkers/truth-tables.js ////////////////////////////
// a common function for seeing whether a table matches, used by the  //
// checkers for truth-table type problems                             //
////////////////////////////////////////////////////////////////////////

function toBool(v) {
    if (v === true || v === 1 || v === '1' || v === 'T' || v === 't') return true;
    if (v === false || v === 0 || v === '0' || v === 'F' || v === 'f') return false;
    return undefined;
}

/*
compares boolean numeric and letter truth values across overlapping rows
returns row difference wrong cell coordinates and the number of checked cells
missing submissions and empty answer tables are accepted without throwing
*/
export function fullTableMatch(ansrows, givenrows) {
    const offcells = [];
    if (!ansrows?.length || !ansrows[0]?.length) {
        return { rowdiff: givenrows?.length ?? 0, offcells, numchecked: 0 };
    }
    const ncols = ansrows[0].length;
    const rowdiff = (ansrows.length - (givenrows?.length ?? 0));
    let rowstocheck = ansrows.length;
    if (rowdiff > 0) {
        rowstocheck = ansrows.length - rowdiff;
    }
    for (let i = 0; i < rowstocheck; i++) {
        const givenrow = givenrows?.[i];
        for (let j = 0; j < ncols; j++) {
            const cellans = toBool(ansrows[i][j]);
            const givencellans = givenrow?.[j] !== undefined ? toBool(givenrow[j]) : undefined;
            if (givencellans === undefined || cellans !== givencellans) {
                offcells.push([i, j]);
            }
        }
    }
    const numchecked = rowstocheck * ncols;
    return { rowdiff, offcells, numchecked };
}

/*
checks exactly one boolean row highlight against the supplied witness predicate
missing highlights fail and predicate errors pass through
*/
export function hasSingleRowHighlight(givenans, isValidWitness) {
    const highlights = Array.isArray(givenans?.rowhls) ? givenans.rowhls : [];
    const selectedCount = highlights.filter((v) => v === true).length;
    return selectedCount === 1 && isValidWitness(highlights.indexOf(true));
}

/*
checks boolean main operator cells in semantic answer tables
an empty table list is vacuously true and missing row cells are false
*/
export function allTrueAtRow(tables, i) {
    return tables.every((table) => table.rows[i]?.[table.opspot] === true);
}
