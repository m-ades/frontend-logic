// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// checkers/multiple-choice.js /////////////////////////
// function that determines if a multiple choice question is correct  //
// or incorrect                                                       //
////////////////////////////////////////////////////////////////////////

// partial credit isn't really possible with multiple choice, alas

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const normalizeIndexArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value
        .map(toNumber)
        .filter((num) => num !== null);
};

const normalizeAnswerValue = (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (Array.isArray(value.answers)) return value.answers;
        if (Object.prototype.hasOwnProperty.call(value, 'ans')) return value.ans;
    }
    return value;
};

const isMultiSelectSubq = (subq) =>
    subq?.type === 'multi-select'
    || Boolean(subq?.multiSelect)
    || Array.isArray(subq?.answerIndices);

const getExpectedForSubq = (subq) => {
    if (isMultiSelectSubq(subq)) {
        return normalizeIndexArray(subq?.answerIndices || []);
    }
    const idx = subq?.answerIndex ?? (Array.isArray(subq?.answerIndices) ? subq.answerIndices[0] : undefined);
    return toNumber(idx);
};

const compareMulti = (expected, given) => {
    const expectedSet = Array.from(new Set(normalizeIndexArray(expected))).sort();
    const givenSet = Array.from(new Set(normalizeIndexArray(given))).sort();
    if (expectedSet.length !== givenSet.length) return false;
    return expectedSet.every((value, idx) => value === givenSet[idx]);
};

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    const subquestions = question?.subquestions || question?.questions;

    if (Array.isArray(subquestions) && subquestions.length > 0) {
        const rawGiven = normalizeAnswerValue(givenans);
        const answers = Array.isArray(rawGiven)
            ? rawGiven
            : (rawGiven !== undefined ? [rawGiven] : []);
        const componentScores = subquestions.map((subq, idx) => {
            const expected = getExpectedForSubq(subq);
            const given = answers[idx];
            if (Array.isArray(expected)) {
                return compareMulti(expected, given) ? 1 : 0;
            }
            return toNumber(given) === expected ? 1 : 0;
        });
        const correct = componentScores.every((score) => score === 1);
        return {
            successstatus: (correct ? "correct" : "incorrect"),
            points: (correct ? points : 0),
            componentScores,
        };
    }

    const normalizedAnswer = normalizeAnswerValue(answer);
    const normalizedGiven = normalizeAnswerValue(givenans);
    const expected = Array.isArray(normalizedAnswer)
        ? normalizeIndexArray(normalizedAnswer)
        : normalizeIndexArray(question?.answerIndices || []);

    if (expected.length > 0) {
        const correct = compareMulti(expected, normalizedGiven);
        return {
            successstatus: (correct ? "correct" : "incorrect"),
            points: (correct ? points : 0),
        };
    }

    const expectedIndex = toNumber(
        normalizedAnswer ?? question?.answerIndex ?? question?.answer
    );
    const correct = expectedIndex !== null && toNumber(normalizedGiven) === expectedIndex;
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        points: (correct ? points : 0)
    };
}
