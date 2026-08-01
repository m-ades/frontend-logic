import { justParse } from '../../../components/ui/logicpenguin/justification-parse.js';

function firstDefined(...values) {
    return values.find((value) => value !== undefined);
}

function normalizeRuleList(value, normalizeRuleName) {
    const source = Array.isArray(value)
        ? value
        : String(value || '').split(/[,\s]+/g);
    const out = [];
    const seen = new Set();
    for (const entry of source) {
        const normalized = normalizeRuleName(String(entry).trim());
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(normalized);
    }
    return out;
}

export function getRulesetRestrictions(question, options) {
    const optionRules = options?.ruleset || {};
    const questionRules = question?.ruleset || {};
    return {
        allow: firstDefined(optionRules.allow, optionRules.allowed, questionRules.allow, questionRules.allowed),
        deny: firstDefined(
            optionRules.deny,
            optionRules.disallow,
            optionRules.disallowed,
            optionRules.forbid,
            optionRules.forbidden,
            questionRules.deny,
            questionRules.disallow,
            questionRules.disallowed,
            questionRules.forbid,
            questionRules.forbidden
        ),
        require: firstDefined(optionRules.require, optionRules.required, questionRules.require, questionRules.required),
        requireAny: firstDefined(
            optionRules.requireAny,
            optionRules.requiredAny,
            questionRules.requireAny,
            questionRules.requiredAny
        ),
    };
}

export function applyRuleFilters(rules, allow, deny, normalizeRuleName) {
    const allowSet = new Set(normalizeRuleList(allow, normalizeRuleName).map((rule) => rule.toLowerCase()));
    const denySet = new Set(normalizeRuleList(deny, normalizeRuleName).map((rule) => rule.toLowerCase()));
    if (allowSet.size === 0 && denySet.size === 0) {
        return rules;
    }

    const filtered = {};
    for (const [name, rule] of Object.entries(rules)) {
        if (rule?.premiserule) {
            filtered[name] = rule;
            continue;
        }
        const key = normalizeRuleName(name).toLowerCase();
        if (denySet.has(key)) continue;
        if (allowSet.size > 0 && !allowSet.has(key)) continue;
        filtered[name] = rule;
    }
    return filtered;
}

function collectCitedRuleKeys(proof, normalizeRuleName) {
    const cited = new Set();
    const walk = (subderiv) => {
        if (!subderiv) return;
        for (const part of Array.isArray(subderiv.parts) ? subderiv.parts : []) {
            if (part?.parts) {
                walk(part);
                continue;
            }
            const { citedrules } = justParse(part?.j ?? '');
            for (const rule of citedrules) {
                const normalized = normalizeRuleName(String(rule).trim());
                if (normalized) cited.add(normalized.toLowerCase());
            }
        }
    };
    walk(proof);
    return cited;
}

function addRuleError(checkResult, message) {
    checkResult.errors = checkResult.errors || {};
    checkResult.errors['??'] = checkResult.errors['??'] || {};
    checkResult.errors['??'].rule = checkResult.errors['??'].rule || {};
    checkResult.errors['??'].rule.high = checkResult.errors['??'].rule.high || {};
    checkResult.errors['??'].rule.high[message] = 1;
}

export function addRequiredRuleErrors(checkResult, proof, require, requireAny, normalizeRuleName) {
    const used = collectCitedRuleKeys(proof, normalizeRuleName);
    const required = normalizeRuleList(require, normalizeRuleName);
    const missing = required.filter((rule) => !used.has(rule.toLowerCase()));
    if (missing.length > 0) {
        addRuleError(checkResult, `missing required rules: ${missing.join(', ')}`);
    }

    const requireAnyList = normalizeRuleList(requireAny, normalizeRuleName);
    if (requireAnyList.length > 0 && !requireAnyList.some((rule) => used.has(rule.toLowerCase()))) {
        addRuleError(checkResult, `use at least one of: ${requireAnyList.join(', ')}`);
    }
}
