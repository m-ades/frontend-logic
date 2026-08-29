/*
purpose grades independently scored components with equal weight
contract returns normalized component scores status and legacy points
invariant every component contributes one equal share
error behavior invalid scores become zero and an empty list is incorrect
*/

function clampScore(value) {
    if (!Number.isFinite(value)) { return 0; }
    if (value < 0) { return 0; }
    if (value > 1) { return 1; }
    return value;
}

function normalizeScores(componentScores) {
    return Array.isArray(componentScores)
        ? componentScores.map(clampScore)
        : [];
}

/*
purpose converts equal component shares to a stored percentage
contract returns a rounded percentage or null when components are absent
invariant every supplied component has equal weight
error behavior invalid component values count as zero
*/
export function componentScorePercent(componentScores) {
    const scores = normalizeScores(componentScores);
    if (scores.length === 0) { return null; }
    return Math.round(
        (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100
    );
}

export function gradeComponents(componentScores, partialcredit, points) {
    const scores = normalizeScores(componentScores);
    const correct = scores.length > 0 && scores.every((score) => score === 1);
    const earnedFraction = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;
    const creditedFraction = correct || partialcredit ? earnedFraction : 0;

    return {
        successstatus: correct ? 'correct' : (creditedFraction > 0 ? 'partial' : 'incorrect'),
        points: Number.isFinite(points) ? points * creditedFraction : 0,
        componentScores: correct || partialcredit ? scores : scores.map(() => 0),
    };
}
