import getFormulaClass from '../symbolic/formula.js';
import { getDerivationCheckerForLogicSystem } from './derivation-by-logic-system.js';
import {
    getAssumptionDepths,
    parseAssumptionScopes,
} from '../../proofArgumentExtractionScopes.js';

function flattenProofLines(parts = []) {
    const lines = [];
    for (const part of parts) {
        if (Array.isArray(part?.parts)) {
            lines.push(...flattenProofLines(part.parts));
        } else if (part) {
            lines.push(part);
        }
    }
    return lines;
}

function getSubmittedJustifications(givenans, premiseCount) {
    if (Array.isArray(givenans?.justifications)) {
        return givenans.justifications.map((value) => String(value ?? '').trim());
    }
    const proof = givenans?.proof
        ?? givenans?.derivationState?.ans
        ?? givenans?.derivationState
        ?? givenans?.ans
        ?? null;
    if (!proof) return [];
    const roots = Array.isArray(proof.parts) ? proof.parts : [];
    const proofRoot = roots.length === 1 && Array.isArray(roots[0]?.parts)
        ? roots[0].parts
        : roots;
    return flattenProofLines(proofRoot)
        .slice(premiseCount)
        .map((line) => String(line?.j ?? '').trim());
}

function getQuestionLines(question) {
    const formulas = Array.isArray(question?.lines) ? question.lines : [];
    const supplied = Array.isArray(question?.justifications)
        ? question.justifications
        : [];
    return formulas.map((formula, index) => ({
        formula,
        justification: String(supplied[index] ?? '').trim(),
    }));
}

function parseArgumentLine(value) {
    if (typeof value !== 'string') return null;
    const pieces = value.split('//');
    if (pieces.length !== 2) return null;
    const premises = pieces[0]
        .split('/')
        .map((formula) => formula.trim())
        .filter(Boolean);
    const conclusion = pieces[1].trim();
    if (!conclusion) return null;
    return { premises, conclusion };
}

function formulasMatch(expected, submitted, Formula) {
    try {
        const expectedFormula = Formula.from(String(expected ?? ''));
        const submittedFormula = Formula.from(String(submitted ?? ''));
        return expectedFormula.wellformed
            && submittedFormula.wellformed
            && expectedFormula.normal === submittedFormula.normal;
    } catch {
        return false;
    }
}

function argumentMatches(argumentLine, premises, conclusion, Formula) {
    const submitted = parseArgumentLine(argumentLine);
    if (!submitted || submitted.premises.length !== premises.length) return false;
    if (!formulasMatch(conclusion, submitted.conclusion, Formula)) return false;
    return premises.every((premise, index) => (
        formulasMatch(premise, submitted.premises[index], Formula)
    ));
}

function nestProofParts(parts, scopes) {
    if (scopes.length === 0) return parts;
    const depths = getAssumptionDepths(scopes, parts.length);
    const root = [];
    const containers = [root];
    let depth = 0;
    parts.forEach((part, index) => {
        while (depth > depths[index]) {
            containers.pop();
            depth -= 1;
        }
        while (depth < depths[index]) {
            const subproof = { parts: [] };
            containers.at(-1).push(subproof);
            containers.push(subproof.parts);
            depth += 1;
        }
        containers.at(-1).push(part);
    });
    return root;
}

function buildCanonicalProof(premises, lines, justifications, scopes) {
    const conclusion = lines.at(-1)?.formula ?? '';
    const premiseParts = premises.map((formula, index) => ({
        n: String(index + 1),
        s: formula,
        j: 'Pr',
    }));
    const proofParts = lines.map((line, index) => ({
        n: String(premises.length + index + 1),
        s: line.formula,
        j: justifications[index],
    }));
    return {
        parts: [{
            showline: { s: conclusion, j: '', isMainConclusion: true, n: '' },
            parts: [...premiseParts, ...nestProofParts(proofParts, scopes)],
        }],
        prems: premises,
        conc: conclusion,
    };
}

// the question owns every formula and any supplied justification; the submission
// owns only the missing citations and argument text
export default async function(
    question, _answer, givenans, partialcredit, points, cheat, options = {}
) {
    const premises = Array.isArray(question?.prems) ? question.prems : [];
    const lines = getQuestionLines(question);
    const conclusion = lines.at(-1)?.formula ?? '';
    if (!conclusion) {
        return {
            successstatus: 'incorrect',
            points: 0,
            message: 'This question has no conclusion line.',
        };
    }

    const notation = options?.notation || 'hurley';
    const Formula = getFormulaClass(notation);
    const submittedJustifications = getSubmittedJustifications(givenans, premises.length);
    const justifications = lines.map((line, index) => (
        line.justification || String(submittedJustifications[index] ?? '').trim()
    ));
    const parsedScopes = options?.logicSystem === 'fitch'
        ? parseAssumptionScopes(question?.assumptionScopes, lines.length)
        : { scopes: [], error: '' };
    if (parsedScopes.error) {
        return {
            successstatus: 'incorrect',
            points: 0,
            message: `This question has invalid assumption scopes: ${parsedScopes.error}`,
        };
    }
    const assumptionRulesCorrect = parsedScopes.scopes.every(({ start }) => (
        justifications[start].toUpperCase() === 'AS'
    ));
    const proof = buildCanonicalProof(
        premises,
        lines,
        justifications,
        parsedScopes.scopes
    );
    const derivationChecker = getDerivationCheckerForLogicSystem(options?.logicSystem);
    const derivationResult = await derivationChecker(
        { prems: premises, conc: conclusion, ruleset: question?.ruleset },
        null,
        proof,
        partialcredit,
        points,
        cheat,
        options
    );
    const argumentCorrect = argumentMatches(
        givenans?.argumentLine ?? givenans?.argument ?? '',
        premises,
        conclusion,
        Formula
    );
    const derivationCorrect = derivationResult?.successstatus === 'correct';
    const correct = argumentCorrect && derivationCorrect && assumptionRulesCorrect;
    const messages = [];
    if (!derivationCorrect) messages.push('The citations do not complete the proof yet.');
    if (!assumptionRulesCorrect) messages.push('Each assumption scope must begin with AS.');
    if (!argumentCorrect) messages.push('The argument does not match the displayed proof.');

    const result = {
        successstatus: correct ? 'correct' : 'incorrect',
        points: correct ? points : 0,
        message: correct ? 'Correct!' : messages.join(' '),
    };
    if (derivationResult?.errors) result.errors = derivationResult.errors;
    if (cheat) result.messages = messages;
    return result;
}
