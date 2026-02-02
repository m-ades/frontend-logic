// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////// checkers/combo-translation-derivation.js ////////////////
// combines translation checking with a derivation check              //
////////////////////////////////////////////////////////////////////////

import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import { equivtest } from '../symbolic/libequivalence.js';
import derivationHurley from './derivation-hurley.js';

let defaultnotation = 'cambridge';
if ((typeof process !== 'undefined') && process?.appsettings?.defaultnotation) {
    defaultnotation = process.appsettings.defaultnotation;
}

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

const resolveExpected = (answer) => {
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

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let notation = defaultnotation;
    if (options?.notation) {
        notation = options.notation;
    }
    const Formula = getFormulaClass(notation);

    let correct = true;
    const messages = [];
    let derivErrors = null;
    const derivTtl = 5;
    const expectedArg = resolveExpected(answer);
    const expectedTransCount = ((expectedArg?.premises?.length ?? 0) + (expectedArg?.conclusion ? 1 : 0)) || 1;
    const transTtl = expectedTransCount;
    let derivEarned = 0;
    let transEarned = 0;

    const expected = expectedArg;
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
        const compareFormulas = (expStr, givenStr, indexLabel) => {
            try {
                const exp = Formula.from(expStr);
                const giv = Formula.from(givenStr);
                if (exp.normal === giv.normal) {
                    return { ok: true };
                }
                const eq = equivtest(exp, giv, notation);
                if (eq?.determinate) {
                    if (eq.equiv) {
                        return { ok: true };
                    }
                    return { ok: false, message: tr(`The ${indexLabel} is not equivalent to the expected translation.`) };
                }
                return { ok: false, message: tr(`Could not determine if the ${indexLabel} is equivalent to the expected translation.`) };
            } catch {
                return { ok: false, message: tr('The argument line contains an invalid formula.') };
            }
        };

        const usedGiven = new Set();
        const premiseMatches = expected.premises.map((expPrem, idx) => {
            for (let gIdx = 0; gIdx < given.premises.length; gIdx++) {
                if (usedGiven.has(gIdx)) continue;
                const res = compareFormulas(expPrem, given.premises[gIdx], tr(`premise ${idx + 1}`));
                if (res.ok) {
                    usedGiven.add(gIdx);
                    return { ok: true };
                }
            }
            return { ok: false };
        });

        for (const match of premiseMatches) {
            if (match.ok) {
                transEarned++;
            } else {
                correct = false;
                messages.push(tr('One or more premises are not equivalent to the expected translation.'));
            }
        }
        if (given.premises.length !== expected.premises.length) {
            correct = false;
            messages.push(tr('The number of premises does not match the expected argument.'));
        }

        const concResult = compareFormulas(expected.conclusion, given.conclusion, tr('conclusion'));
        if (concResult.ok) {
            transEarned++;
        } else {
            correct = false;
            if (concResult.message) {
                messages.push(concResult.message);
            }
        }
    }

    const providedProof = givenans?.proof
        ?? givenans?.derivationState?.ans
        ?? givenans?.derivationState
        ?? givenans?.ans
        ?? null;

    if (!given.error && providedProof) {
        const derivQuestion = {
            ...question,
            prems: given.premises,
            conc: given.conclusion,
        };
        const derivResult = await derivationHurley(
            derivQuestion,
            providedProof,
            derivTtl,
            options
        );
        if (derivResult.successstatus === 'correct') {
            derivEarned = derivTtl;
        } else {
            correct = false;
            derivErrors = derivResult.errors || null;
            messages.push(tr('The derivation is not correct yet.'));
        }
    } else if (!providedProof) {
        correct = false;
        messages.push(tr('No derivation was submitted.'));
    }

    // Derivations are all-or-nothing; no partial credit for combo translation-derivation
    const earned = correct ? points : 0;

    const translationScore = transTtl > 0 ? (transEarned / transTtl) : 0;
    const derivationScore = derivTtl > 0 ? (derivEarned / derivTtl) : 0;

    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: earned,
        componentScores: [translationScore, derivationScore],
    };
    if (cheat) {
        rv.messages = messages;
        if (derivErrors) {
            rv.errors = derivErrors;
        }
    }
    return rv;
}
