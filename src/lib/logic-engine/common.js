// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import { checkers as localcheckers } from '@logic-app/logic-engine/checkers.js';

export async function localCheck(prob) {
    // read info from problem
    const problemtype = prob.myproblemtype;
    const rightans = prob.myanswer;
    const givenans = prob.getAnswer();
    const question = prob.myquestion;
    // sanity checks
    if (!question || !problemtype || (typeof givenans === 'undefined')) {
        return false;
    }
    const hasEmbeddedAnswer =
        Object.prototype.hasOwnProperty.call(question, 'answer')
        || Object.prototype.hasOwnProperty.call(question, 'answerIndex')
        || (Array.isArray(question?.answerIndices) && question.answerIndices.length > 0)
        || (
            Array.isArray(question?.subquestions)
            && question.subquestions.some((subq) =>
                Object.prototype.hasOwnProperty.call(subq ?? {}, 'answer')
                || Object.prototype.hasOwnProperty.call(subq ?? {}, 'answerIndex')
                || (Array.isArray(subq?.answerIndices) && subq.answerIndices.length > 0)
            )
        )
        || (
            Array.isArray(question?.questions)
            && question.questions.some((subq) =>
                Object.prototype.hasOwnProperty.call(subq ?? {}, 'answer')
                || Object.prototype.hasOwnProperty.call(subq ?? {}, 'answerIndex')
                || (Array.isArray(subq?.answerIndices) && subq.answerIndices.length > 0)
            )
        );
    // Some sandbox question types embed the correct answer directly in the
    // question payload instead of passing it through myanswer.
    if ((typeof rightans === 'undefined') && !hasEmbeddedAnswer) {
        return false;
    }
    const savestatus = prob.getIndicatorStatus().savestatus;
    const checkerOptions = prob.options ?? {};
    const partialcredit = Boolean(
        checkerOptions.partialCredit
        ?? checkerOptions.partialcredit
        ?? checkerOptions.partial_credit
        ?? question.partialCredit
        ?? question.partialcredit
        ?? question.partial_credit
        ?? question.options?.partialCredit
        ?? question.options?.partialcredit
        ?? question.options?.partial_credit
        ?? false
    );
    if (!localcheckers[problemtype]) {
        prob.setIndicator({
            savestatus: 'malfunction',
            successstatus: 'malfunction',
            score: 0,
            message: 'Unsupported problem type.',
        });
        return false;
    }
    const checkStatus = await localcheckers[problemtype](question, rightans,
        givenans, partialcredit, true, checkerOptions);
    // saved status based on previous save status
    checkStatus.savestatus = savestatus;
    prob.setIndicator(checkStatus);
    return checkStatus;
}
