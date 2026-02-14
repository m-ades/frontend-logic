// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////// checkers/nonclassical-truth-table.js ///////////////////
// multiple-choice grading for non-classical truth table problems     //
////////////////////////////////////////////////////////////////////////

import multipleChoice from './multiple-choice.js';

export default async function(
  question, answer, givenans, partialcredit, points, cheat, options
) {
  // grade only the mc layer
  const subquestions = question?.subquestions || question?.questions;
  const normalizedQuestion = subquestions ? { ...question, subquestions } : question;

  if (Array.isArray(subquestions)) {
    const answers = Array.isArray(givenans?.answers) ? givenans.answers : [];
    const ansValue = givenans?.ans ?? givenans;
    const normalizedAnswers = answers.length ? answers : (ansValue !== undefined ? [ansValue] : []);
    return multipleChoice(
      normalizedQuestion,
      answer,
      { answers: normalizedAnswers },
      partialcredit,
      points,
      cheat,
      options
    );
  }

  const actual = givenans?.ans ?? givenans;
  return multipleChoice(normalizedQuestion, answer, actual, partialcredit, points, cheat, options);
}
