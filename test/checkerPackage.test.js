import test from 'node:test';
import assert from 'node:assert/strict';
import { localCheck } from '../src/lib/logic-engine/common.js';
import { computeTruthTableAnswer } from '@logic-app/logic-engine/truthTableAnswer.js';
import { mapQuestionToProof } from '../src/lib/mapQuestionToProof.js';

test('local standalone choices accept correct selections with empty composite fields', async () => {
  for (const [answer, correct, incorrect] of [[{ answerIndex: 1 }, 1, 0], [{ answerIndices: [0, 2] }, [2, 0], [0]]]) {
    const proof = mapQuestionToProof({
      id: 1,
      question_snapshot: { type: 'multiple-choice', choices: ['a', 'b', 'c'], ...answer },
    }, { id: 1 }, 0);
    assert.deepEqual(proof.multipleChoice.subquestions, []);
    for (const [selection, status] of [[correct, 'correct'], [incorrect, 'incorrect']]) {
      const result = await localCheck({
        myquestion: proof.multipleChoice,
        myproblemtype: 'multiple-choice',
        myanswer: proof.answer,
        getAnswer: () => selection,
        getIndicatorStatus: () => ({ savestatus: 'unsaved' }),
        setIndicator: () => {},
      });
      assert.equal(result.successstatus, status);
      assert.equal(result.score, status === 'correct' ? 100 : 0);
      assert.equal(Object.hasOwn(result, 'points'), false);
    }
  }
});

test('local choices still earn one hundred or zero inside a single subquestion', async () => {
  for (const partialCredit of [true, false]) {
    for (const [selection, score] of [[1, 100], [0, 0], ['', 0]]) {
      const result = await localCheck({
        myquestion: { subquestions: [{ answerIndex: 1 }] },
        myproblemtype: 'multiple-choice',
        options: { partialCredit },
        getAnswer: () => ({ answers: [selection] }),
        getIndicatorStatus: () => ({ savestatus: 'unsaved' }),
        setIndicator: () => {},
      });
      assert.equal(result.score, score);
      assert.equal(result.successstatus, score === 100 ? 'correct' : 'incorrect');
    }
  }
});

test('local composite choices keep legacy subquestions and partial credit', async () => {
  const subquestions = [{ answerIndex: 1 }, { answerIndex: 0 }];
  for (const fields of [
    { subquestions },
    { questions: subquestions },
    { subquestions: [], questions: subquestions },
    { subquestions, multipleChoice: { subquestions: [] } },
    { multipleChoice: { questions: subquestions } },
  ]) {
    const proof = mapQuestionToProof({
      id: 1, question_snapshot: { type: 'multiple-choice', partialCredit: true, ...fields },
    }, { id: 1 }, 0);
    assert.deepEqual(proof.multipleChoice.subquestions, subquestions);
    for (const [answers, status, score] of [[[1, 0], 'correct', 100], [[1, 1], 'partial', 50]]) {
      const result = await localCheck({
        myquestion: proof.multipleChoice,
        myproblemtype: 'multiple-choice',
        myanswer: proof.answer,
        options: { partialCredit: proof.partialCredit },
        getAnswer: () => ({ answers }),
        getIndicatorStatus: () => ({ savestatus: 'unsaved' }),
        setIndicator: () => {},
      });
      assert.equal(result.successstatus, status);
      assert.equal(result.score, score);
    }
  }
});

test('local combo feedback retains partial status and returns its percentage', async () => {
  const result = await localCheck({
    myproblemtype: 'combo-translation-truth-table',
    myquestion: {},
    myanswer: { premises: ['A'], conclusion: 'B' },
    options: { partialCredit: true, notation: 'hurley' },
    getAnswer: () => ({ argumentLine: 'A // B' }),
    getIndicatorStatus: () => ({ savestatus: 'unsaved' }),
    setIndicator: () => {},
  });
  assert.equal(result.successstatus, 'partial');
  assert.equal(Object.hasOwn(result, 'points'), false);
  assert.deepEqual(result.componentScores, [1, 0]);
  assert.deepEqual(result.componentWeights, [2, 4]);
  assert.equal(result.score, 33);
});

for (const partialCredit of [true, false]) {
  test(`local combo percentages preserve weights with partial credit ${partialCredit}`, async () => {
    const ownAnswer = computeTruthTableAnswer({ truthTable: { kind: 'argument', statements: ['A', 'A'] } });
    const expectedAnswer = computeTruthTableAnswer({ truthTable: { kind: 'argument', statements: ['A', 'B'] } });
    const table = (answer, valid) => ({ lefts: answer.prems, right: answer.conc, valid });
    for (const [submission, percentage] of [
      [{ argumentLine: '' }, 0],
      [{ argumentLine: 'A // B' }, 33],
      [{ argumentLine: 'A // A', tableAns: table(ownAnswer, true) }, 67],
      [{ argumentLine: 'A // B', tableAns: table(expectedAnswer, true) }, 67],
      [{ argumentLine: 'A // B', tableAns: table(expectedAnswer, false) }, 100],
    ]) {
      const result = await localCheck({
        myproblemtype: 'combo-translation-truth-table',
        myquestion: {},
        myanswer: { premises: ['A'], conclusion: 'B' },
        options: { partialCredit, notation: 'hurley' },
        getAnswer: () => submission,
        getIndicatorStatus: () => ({ savestatus: 'unsaved' }),
        setIndicator: () => {},
      });
      assert.equal(Object.hasOwn(result, 'points'), false);
      assert.equal(result.score,
        partialCredit || percentage === 100 ? percentage : 0);
    }
  });
}

test('the runtime package does not export its source tests', async () => {
  await assert.rejects(import('@logic-app/logic-engine/test/regressions.js'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
});
