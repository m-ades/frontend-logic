// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////// checkers/combo-translation-truth-table.js ///////////////
// uses functions from other scripts to check a combination problem   //
////////////////////////////////////////////////////////////////////////

import tr from '../translate.js';
import checkArgumentTT from './argument-truth-table.js';
import getFormulaClass from '../symbolic/formula.js';
import { argumentTables } from '../symbolic/libsemantics.js';

let defaultnotation = 'cambridge';
if ((typeof process !== 'undefined') && process?.appsettings?.defaultnotation) {
    defaultnotation = process.appsettings.defaultnotation;
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    // set notation
    let notation = defaultnotation;
    if (options?.notation) {
        notation = options.notation;
    }
    const Formula = getFormulaClass(notation);
    //
    let correct = true;
    const messages = [];
    let offcells = false;
    let qright = null;
    let rowdiff = 0;
    let ttTtl = 5;
    let ttEarned = 0;
    let transptsearned = 0;
    let transptsttl = 1;

    const parseArgumentLine = (line) => {
        if (!line || typeof line !== 'string') return { error: tr('Enter the argument as a single line.') };
        const parts = line.split('//');
        if (parts.length !== 2) {
            return { error: tr('Use "//" to separate premises from the conclusion.') };
        }
        const premisesPart = parts[0].trim();
        const conclusion = parts[1].trim();
        if (!premisesPart) return { error: tr('Enter at least one premise before "//".') };
        if (!conclusion) return { error: tr('Enter a conclusion after "//".') };
        const premises = premisesPart
            .split('/')
            .map((premise) => premise.trim())
            .filter(Boolean);
        if (premises.length === 0) return { error: tr('Enter at least one premise before "//".') };
        return { premises, conclusion };
    };

    const resolveExpected = () => {
        if (answer?.argument || answer?.argumentLine) {
            return parseArgumentLine(answer.argument ?? answer.argumentLine);
        }
        if (Array.isArray(answer?.premises) && answer?.conclusion) {
            return { premises: answer.premises, conclusion: answer.conclusion };
        }
        if (Array.isArray(answer?.translations) && Number.isInteger(answer?.index)) {
            const conclusion = answer.translations[answer.index] ?? '';
            const premises = answer.translations.filter((_, idx) => idx !== answer.index);
            return { premises, conclusion };
        }
        return { error: tr('No expected argument found.') };
    };

    const expected = resolveExpected();
    if (expected.error) {
        correct = false;
        messages.push(expected.error);
    }

    const givenLine = givenans?.argumentLine ?? givenans?.argument ?? '';
    const given = parseArgumentLine(givenLine);
    if (given.error) {
        correct = false;
        messages.push(given.error);
    } else if (!expected.error) {
        try {
            const normalize = (statement) => Formula.from(statement).normal;
            const expectedPremises = expected.premises.map(normalize);
            const givenPremises = given.premises.map(normalize);
            const expectedConclusion = normalize(expected.conclusion);
            const givenConclusion = normalize(given.conclusion);
            const samePremiseCount = expectedPremises.length === givenPremises.length;
            const samePremiseOrder = samePremiseCount &&
                expectedPremises.every((premise, idx) => premise === givenPremises[idx]);
            if (!samePremiseOrder || expectedConclusion !== givenConclusion) {
                correct = false;
                messages.push(tr('The argument line does not match the expected translation.'));
            } else {
                transptsearned++;
            }
        } catch {
            correct = false;
            messages.push(tr('The argument line contains an invalid formula.'));
        }
    }
    // check tables
    if (givenans.tableAns && !expected.error) {
        const premises = expected.premises;
        const conclusion = expected.conclusion;
        const pwffs = premises.map((p)=>(Formula.from(p)));
        const cwff = Formula.from(conclusion);
        const tablesShouldBe = argumentTables(pwffs, cwff, notation);
        const tcQ = {
            prems: premises,
            conc: conclusion
        }
        const tableCheck = await checkArgumentTT(
             tcQ, tablesShouldBe, givenans.tableAns,
                partialcredit, ttTtl, cheat, { question: true }
        );
        ttEarned = tableCheck.points;
        if ("qright" in tableCheck) {
            qright = tableCheck.qright;
        }
        if (tableCheck.successstatus == 'correct') {
            qright = true;
        } else {
            correct = false;
            messages.push(tr('There are errors with the truth ' +
                'table or answer given there.'));
            if (tableCheck.offcells) {
                offcells = tableCheck.offcells;
            }
            if (tableCheck.rowdiff && tableCheck.rowdiff != 0) {
                messages.push(tr('The truth table uses the wrong ' +
                    'number of rows.'));
                rowdiff = tableCheck.rowdiff;
            }
        }
    }
    let earned = 0;
    if (partialcredit) {
        if (correct) {
            earned = points;
        } else {
            const allpts = ttEarned + transptsearned;
            const avail = ttTtl + transptsttl;
            earned = Math.floor(
                points * (allpts/avail)
            );
        }
    } else {
        // all or nothing
        earned = correct ? points : 0;
    }
    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: earned
    }
    if (cheat) {
        if (offcells) {
            rv.offcells = offcells;
        }
        if (qright) {
            rv.qright = true;
        } else {
            rv.qright = false;
        }
        if (rowdiff) {
            rv.rowdiff = rowdiff;
        }
        rv.messages = messages;
    }
    return rv;
}
