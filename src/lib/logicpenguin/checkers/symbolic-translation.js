// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// checkers/symbolic-translation.js ///////////////////
// tests whether a translation exercise is correct by testing it for //
// equivalence with correct answer; note: may give indeterminate     //
// answers in polyadic predicate logic                               //
///////////////////////////////////////////////////////////////////////

import getFormulaClass from '../symbolic/formula.js';
import tr from '../translate.js';
import { equivtest } from '../symbolic/libequivalence.js';

// try to read default notation from process settings if running
// on a server
let defaultnotation = 'hurley';
if ((typeof process != 'undefined') &&
    process?.appsettings?.defaultnotation) {
    defaultnotation = process.appsettings.defaultnotation;
}

function checkTranslation(ansstr, givenstr, pred = true,
    notationname = defaultnotation) {
    let maxfrac = 1;
    // load formula class for the notation
    const Formula = getFormulaClass(notationname);
    // parse strings
    const ans = Formula.from(ansstr);
    const given = Formula.from(givenstr);
    // initialize variables
    let message = '';
    let correct = true;
    let determinate = true;
    // Never let a raw string match bypass parsing. If the stored answer is
    // malformed, grading is indeterminate until the question is corrected.
    if (!ans.wellformed) {
        return {
            correct: false,
            determinate: false,
            message: tr('the intended translation is not syntactically well ' +
                'formed (' + ans.syntaxerrors + ')'),
            ptfrac: 0
        };
    }
    // ensure well formed
    if (!given.wellformed) {
        maxfrac = 0.8;
        message += tr('the formula given is not syntactically well ' +
            'formed (' + given.syntaxerrors + ')');
        correct = false;
    }
    // ensure no free vars when pred = true
    if (pred) {
        if (given.freevars.length != 0) {
            maxfrac = maxfrac - 0.1;
            message += ((message == '') ? '' : '; ') +
                tr('translation uses a variable (' +
                given.freevars.join(', ') + ') not bound by a quantifier');
            correct = false;
        }
    } else {
        // should not have terms
        if (given.terms.length != 0) {
            maxfrac = maxfrac - 0.1;
            message += ((message == '') ? '' : '; ') +
                tr('Sentential Logic translation incorrectly uses ' +
                    'terms (' + given.terms.join(', ') +
                    ') or quantifiers');
            correct = false;
        }
    }
    // check if evaluate to the same once syntactic errors or
    // harmless differences taken into account
    if (ans.normal == given.normal) {
        return { correct, determinate, message, ptfrac: maxfrac };
    }
    // check for equivalence
    const equivtestresult = equivtest(ans, given, notationname);
    // todo? better partial credit for translations;
    // currently awards up to 20% just for being well-formed??
    if (equivtestresult.determinate) {
        determinate = true;
        if (!equivtestresult.equiv) {
            correct = false;
            message += ((message == '') ? '' : '; ') +
                'formula provided is not equivalent to the correct ' +
                'translation';
            maxfrac = Math.max(0, maxfrac - 0.8);
        }
    } else {
        maxfrac = Math.max(0, maxfrac - 0.8);
        message += ((message == '') ? '' : '; ') +
            'equivalence checker could not determine whether or not ' +
            'the formula provided is equivalent to the intended one';
        if (correct) {
            determinate = false;
            correct = false;
        }
    }
    return { correct, determinate, message, ptfrac: maxfrac }
}

function splitTopLevel(value, separator) {
    const parts = [];
    let start = 0;
    let depth = 0;
    const brackets = { '(': 1, '[': 1, '{': 1, ')': -1, ']': -1, '}': -1 };
    for (let index = 0; index < value.length; index++) {
        depth = Math.max(0, depth + (brackets[value[index]] ?? 0));
        if (depth === 0 && value.startsWith(separator, index)) {
            parts.push(value.slice(start, index).trim());
            index += separator.length - 1;
            start = index + 1;
        }
    }
    parts.push(value.slice(start).trim());
    return parts;
}

// parses one answer into unordered statements and an optional final conclusion

function parseTranslationAnswer(value, notationname) {
    if (typeof value !== 'string') return null;
    const fitch = notationname === 'calgary';
    const source = fitch ? value.replaceAll(':.', '∴') : value;
    const statementSeparator = fitch ? ',' : '/';
    const conclusionSeparator = fitch ? '∴' : '//';
    const conclusionParts = splitTopLevel(source.trim(), conclusionSeparator);
    if (conclusionParts.length > 2) return null;
    const statements = splitTopLevel(conclusionParts[0] ?? '', statementSeparator);
    const conclusion = conclusionParts.length === 2
        ? conclusionParts[1].trim()
        : null;
    if (statements.length === 0 || statements.some((statement) => !statement) ||
        (conclusionParts.length === 2 && !conclusion)) return null;
    return { statements, conclusion };
}

function matchStatements(answers, given, pred, notationname) {
    const unused = new Set(given.map((_statement, index) => index));
    let determinate = true;
    for (const answer of answers) {
        let match = null;
        let unresolved = false;
        for (const index of unused) {
            const result = checkTranslation(
                answer, given[index], pred, notationname);
            if (result.correct) {
                match = index;
                break;
            }
            if (!result.determinate) unresolved = true;
        }
        if (match === null) {
            return { correct: false, determinate: determinate && !unresolved };
        }
        unused.delete(match);
        determinate = determinate && !unresolved;
    }
    return { correct: true, determinate };
}

// checks every statement as one answer while allowing premise reordering
function checkTranslationAnswer(ansstr, givenstr, pred = true,
    notationname = defaultnotation) {
    const answer = parseTranslationAnswer(ansstr, notationname);
    if (!answer) {
        return {
            correct: false,
            determinate: false,
            message: tr('the intended translation answer is invalid'),
            ptfrac: 0
        };
    }
    const given = parseTranslationAnswer(givenstr, notationname);
    if (!given) {
        return {
            correct: false,
            determinate: true,
            message: tr('the translation answer is incomplete'),
            ptfrac: 0
        };
    }
    if (answer.statements.length !== given.statements.length ||
        Boolean(answer.conclusion) !== Boolean(given.conclusion)) {
        return {
            correct: false,
            determinate: true,
            message: tr('the answer does not have the expected structure'),
            ptfrac: 0
        };
    }
    const statementResult = matchStatements(
        answer.statements, given.statements, pred, notationname);
    if (!statementResult.correct) {
        return {
            correct: false,
            determinate: statementResult.determinate,
            message: tr(answer.conclusion
                ? 'one or more premises are not equivalent to the intended translation'
                : 'one or more statements are not equivalent to the intended translation'),
            ptfrac: 0
        };
    }
    if (answer.conclusion) {
        const conclusionResult = checkTranslation(
            answer.conclusion, given.conclusion, pred, notationname);
        if (!conclusionResult.correct) {
            return {
                ...conclusionResult,
                message: conclusionResult.message
                    ? tr('conclusion: ') + conclusionResult.message
                    : tr('the conclusion is not equivalent to the intended translation')
            };
        }
    }
    return { correct: true, determinate: true, message: '', ptfrac: 1 };
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    // call function above
    const result = checkTranslationAnswer(answer, givenans,
        (options?.pred ?? true), (options?.notation ?? defaultnotation));
    // all-or-nothing; no partial credit for symbolic translation
    const awarded = (result.correct) ? points : 0;
    // set up return value
    const rv = {
        successstatus: ((result.determinate) ?
            ((result.correct) ? "correct" : "incorrect" )
                : "indeterminate"),
        points: awarded
    }
    // only return detailed message if hints set
    if (result.message && options.hints) {
        rv.transmessage = result.message;
    }
    return rv;
 }
