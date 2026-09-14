// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import { checkers as localcheckers } from '@logic-app/logic-engine/checkers.js';

// determine URL
export const url = new URL(import.meta.url).origin;

// adds element to specified parent, with additional properties
// as set by opts
export function addelem(tag, parnode, opts = {}) {
    const elem = document.createElement(tag);
    parnode.append(elem);
    for (const opt in opts) {
        if (opt == 'classes') {
            for (const cl of opts.classes) {
                elem.classList.add(cl);
            }
        } else {
            elem[opt] = opts[opt];
        }
    }
    return elem;
}

// get an element by id; just less to write
export function byid(id) {
    return document.getElementById(id);
}

// create a box that displays information at the top of the page
export function makeInfobox() {
    const ibox = document.createElement("div");
    ibox.classList.add('infobox');
    ibox.fillme = function(message, msgicon) {
        const icontag = '<span class="material-symbols-outlined">' + msgicon + '</span>';
        this.innerHTML = '<table class="' + msgicon + '"><tbody>' +
            '<tr><td>' + icontag + '</td><td>' + message + '</td></tr>' +
            '</tbody></table>';
        if (msgicon == 'error') {
            this.scrollIntoView({ block: 'nearest' });
        }
    }
    return ibox;
}

// escape &,>,< character in a string with their html escape sequences
export function htmlEscape(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// put new information in the infobix
export function infoboxMsg(message, msgicon) {
    const infobox = document.getElementById('infobox');
    if (!infobox || !infobox.fillme) {
        console.error('INFOBOX Message (' + msgicon + '): ' + message);
        return;
    }
    infobox.fillme(message, msgicon);
}

// send a JSON request to server
export function jsonRequest(obj, callback) {
    // fill in data that is always needed
    if (window?.launchid)    { obj.launchid    = window.launchid; }
    if (window?.exnum)       { obj.exnum       = window.exnum; };
    if (window?.userid)      { obj.userid      = window.userid; }
    if (window?.contextid)   { obj.contextid   = window.contextid; }
    if (window?.consumerkey) { obj.consumerkey = window.consumerkey; }

    // serialize data as json
    let json = '';
    try {
        json = JSON.stringify(obj);
    } catch(err) {
        callback('Unable to serialize data to be sent to server.', false);
        return false;
    }
    if (json == '') {
        callback('No data to be sent to server.', false);
        return false;
    }

    // create request
    const xhttp = new XMLHttpRequest();
    xhttp.open("POST", url + '/json', true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.responseType = 'json';

    // respond when completed
    xhttp.onreadystatechange = function() {
        if (this.readyState != 4) { return; }
        if ((this.status < 200) || (this.status>= 300)) {
            callback(this.statusText ?? 'Unknown error', false);
            return;
        }
        const respobj = this.response;
        if (!respobj) {
            callback('Invalid response from server', false);
        }
        if (respobj.error) {
            callback(respobj.errMsg ??
                'Unknown error reported by server', false);
            return;
        }
        callback(false, respobj);
    }

    // send request
    xhttp.send(json);
}

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
            points: -1,
            message: 'Unsupported problem type.',
        });
        return false;
    }
    // a positive scale lets checkers determine partial credit before hiding local points
    const checkStatus = await localcheckers[problemtype](question, rightans,
        givenans, partialcredit, 100, true, checkerOptions);
    // local checks never confer points
    checkStatus.points = -1;
    // saved status based on previous save status
    checkStatus.savestatus = savestatus;
    prob.setIndicator(checkStatus);
    return checkStatus;
}

// mark question in reaction to save response from server
export function processSaveAnswerResponse(err, respobj) {
    // ensure second argument is an object, for
    // referencing its properties
    if (!respobj) { respobj = {} };

    // determine which problem the response is about
    let target = false;
    if (respobj.elemid) {
        target = byid(respobj.elemid);
    }
    if (!target || !respobj.timestamp || !respobj.newind) {
        if (err) {
            infoboxMsg("Error reported by server or when processing response: " +
                err.toString() + " Check your internet connection and reload " +
                "page. If the problem persists, contact your instructor.", "error");
        } else {
            infoboxMsg("Page malfunction: unexpected response from server " +
            "when processing save request. No target specified. " +
            "Check your internet connection and reload page. If the " +
            "problem persists, contact your instructor.","error");
        }
        return;
    }

    // process error, either as a string, or as Error
    // set problem to malfunction
    if (err) {
        target.setIndicator({
            savestatus: 'malfunction',
            sucesstatus: 'malfunction',
            points: -1,
            message: 'Error saving answer: ' + err.toString() +
                '... Check your internet connection and reload the ' +
                'page. If the problem persists, contact your ' +
                'instructor.'
        });
        return;
    }

    // check if problem has been changed since response
    // if not; set its indicator
    if (target.changedat <= respobj.timestamp) {
        target.setIndicator(respobj.newind);
    }
}

// json request to save answer
export function sendAnswerToServer(saveinfo) {
    jsonRequest(saveinfo, function(err, respobj) {
        processSaveAnswerResponse(err, respobj);
    });
}
