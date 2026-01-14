import multipleChoice from './multiple-choice.js';

export default async function(
  question, answer, givenans, partialcredit, points, cheat, options
) {
  const actual = givenans?.ans ?? givenans;
  return multipleChoice(question, answer, actual, partialcredit, points, cheat, options);
}
