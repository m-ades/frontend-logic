// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// checkers/derivation-hurley.js /////////////////////
// hurley-specific derivation checker, uses derivation-check.js    //
////////////////////////////////////////////////////////////////////////

import getRules from './rules/hurley-rules.js';
import DerivationCheck from './derivation-check.js';
import { justParse } from '../../../components/ui/logicpenguin/justification-parse.js';

function normalizeRuleName(rule) {
    if (!rule) return '';
    const alias = DerivationCheck.ruleAliases?.[rule];
    return alias || rule;
}

function collectCitedRules(proof) {
    const cited = new Set();
    const walk = (subderiv) => {
        if (!subderiv) return;
        const parts = Array.isArray(subderiv.parts) ? subderiv.parts : [];
        for (const part of parts) {
            if (part?.parts) {
                walk(part);
                continue;
            }
            const justification = part?.j ?? '';
            if (!justification) continue;
            const { citedrules } = justParse(justification);
            for (const rule of citedrules) {
                const normalized = normalizeRuleName(String(rule).trim());
                if (normalized) {
                    cited.add(normalized);
                }
            }
        }
    };
    walk(proof);
    return cited;
}

export default async function(question, givenans, points, options) {
    // clone the answer to avoid messing it up when checking it
    const ansclone = JSON.parse(JSON.stringify(givenans));
    const rules = getRules();
    const checkResult = new DerivationCheck(
        rules,
        ansclone,
        question.prems,
        question.conc,
        { allowOpenScopeCitations: true, assumptionMode: 'flat' }
    ).report();
    const require = options?.ruleset?.require || question?.ruleset?.require;
    const requireAny = options?.ruleset?.requireAny || question?.ruleset?.requireAny;
    const required = new Set(
        (Array.isArray(require) ? require : [])
            .map((rule) => normalizeRuleName(String(rule).trim()))
            .filter(Boolean)
    );
    if (required.size > 0) {
        const used = collectCitedRules(ansclone);
        const missing = Array.from(required).filter((rule) => !used.has(rule));
        if (missing.length > 0) {
            checkResult.errors = checkResult.errors || {};
            checkResult.errors['??'] = checkResult.errors['??'] || {};
            checkResult.errors['??'].rule = checkResult.errors['??'].rule || {};
            checkResult.errors['??'].rule.high = checkResult.errors['??'].rule.high || {};
            checkResult.errors['??'].rule.high[
                `missing required rules: ${missing.join(', ')}`
            ] = 1;
        }
    }
    const requireAnySet = new Set(
        (Array.isArray(requireAny) ? requireAny : [])
            .map((rule) => normalizeRuleName(String(rule).trim()))
            .filter(Boolean)
    );
    if (requireAnySet.size > 0) {
        const used = collectCitedRules(ansclone);
        const satisfied = Array.from(requireAnySet).some((rule) => used.has(rule));
        if (!satisfied) {
            checkResult.errors = checkResult.errors || {};
            checkResult.errors['??'] = checkResult.errors['??'] || {};
            checkResult.errors['??'].rule = checkResult.errors['??'].rule || {};
            checkResult.errors['??'].rule.high = checkResult.errors['??'].rule.high || {};
            checkResult.errors['??'].rule.high[
                `use at least one of: ${Array.from(requireAnySet).join(', ')}`
            ] = 1;
        }
    }
    // only correct if no errors
    const correct = (Object.keys(checkResult.errors).length == 0);
    points = (correct) ? points : 0;
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        errors: checkResult.errors,
        points: points
    }
}
