// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////////// formula-input.js /////////////////////////////////
// defines symbolic formula input field class and adds insertion widget  //
// to the window                                                         //
///////////////////////////////////////////////////////////////////////////

import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js';
import { addelem, htmlEscape } from '../../../lib/logicpenguin/common.js';

export default class FormulaInput {

    // generic function for making changes, used by other functions
    static autoChange(findbefore, repbefore, ins, findafter, repafter) {

        // make replacement in what is before the cursor
        const before = this.value.substr(0,this.selectionStart)
            .replace(findbefore, repbefore);

        // get what is after cursor, and change it if also requested
        let after= this.value.substr(this.selectionEnd);
        if (findafter) {
            after = after.replace(findafter, repafter);
        }

        // determine where to put the cursor after change; focus input
        let pos = before.length + ins.length;
        this.value = before + ins + after;
        this.focus();
        this.setSelectionRange(pos, pos);
        // trigger change
        if (this?.myline?.mysubderiv?.myprob.makeChanged) {
            this?.myline?.mysubderiv?.myprob.makeChanged(false, true);
        }
    }

    // functin called on formula inputs when they are unfocused/blurred
    static blur(e) {

        // record when this happened
        this.lastblurred = (new Date()).getTime();

        // don't react to widget changes
        if (e?.relatedTarget?.classList?.contains('symbolwidgetbutton') ||
            e?.relatedTarget?.classList?.contains('derivchartlabel') ||
            e?.relatedTarget?.classList?.contains('ruleselect')
        ) {
            return;
        }

        // justification widgets shouldn't react to clicks on rules or
        // line numbers
        if ((e?.relatedTarget?.classList?.contains('derivationlinenumber') ||
            e?.relatedTarget?.classList?.contains('rulenamedisplay') ||
            e?.relatedTarget?.classList?.contains('ruledisplay'))
            && this.classList.contains("justification")) {
            return;
        }

        // hide symbol insertion widget focused for this
        if (this.symbolwidget) {
            this.symbolwidget.hide();
        }

        // don't hide the rule display if losing focus because of click
        // on it
        if (e?.relatedTarget?.classList?.contains('rulenamedisplay') ||
            e?.relatedTarget?.classList?.contains('ruledisplay')) {
            e.blockhide = true;
        }

        // fix its value to something better looking
        this.value = this.inputfix(this.value);

        // use blurHook to have blurring do other things
        if (this.blurHook) {
            this.blurHook(e);
        }
        return;
    }

    static focus(e) {

        // don't react to widget changes
        for (const widgettype of [
            'symbolwidgetbutton',
            'derivationlinenumber'
        ]) {
            if (e?.relatedTarget?.classList?.contains(widgettype)) {
                return;
            }
        }

        // set the value so we can tell if edits changed it later on
        this.oldvalue = this.value;

        // check if script calling it has added a hook to focus
        if (this.focusHook) {
            this.focusHook(e);
        }

        // don't show widget if the input is read-only
        if (this.readOnly) { return; }

        // show the symbol insertion widget
        if (this.symbolwidget) {
            this.symbolwidget.showfor(this);
        }

    }

    static hideWidgets() {
        let ww = document.getElementsByClassName("symbolinsertwidget");
        while (ww.length > 0) {
            const w = ww[ ww.length - 1 ];
            w.parentNode.removeChild(w);
        }
    }

    // create a new formula input and return it
    static getnew(options = {}) {

        // create the DOM element
        const elem = document.createElement("input");
        elem.type = "text";

        // add all options to the input
        for (const opt in options) {
            elem[opt] = options[opt];
        }

        // assign classes for css
        elem.classList.add("formulainput","symbolic");

        // assign the static event listeners
        elem.addEventListener("blur", FormulaInput.blur);
        elem.addEventListener("focus", FormulaInput.focus);
        elem.addEventListener("keydown", FormulaInput.keydown);
        // input always make the problem changed
        elem.addEventListener("input", () => {
            if (this?.myline?.mysubderiv?.myprob.makeChanged) {
                this?.myline?.mysubderiv?.myprob.makeChanged(false, true);
            }
        });
        elem.addEventListener("change", () => {
            if (this?.myline?.mysubderiv?.myprob.makeChanged) {
                this?.myline?.mysubderiv?.myprob.makeChanged();
            }
        });

        // add the static functions
        elem.insOp = FormulaInput.insOp;
        elem.insertHere = FormulaInput.insertHere;
        elem.autoChange = FormulaInput.autoChange;

        // attach syntax, symbols and inputfix
        const syntax = getSyntax();
        elem.syntax = syntax;
        elem.symbols = syntax.symbols;
        elem.inputfix = syntax.inputfix;

        // attach a symbolwidget
        elem.symbolwidget = makeSymbolWidget();
        return elem;
    }

    // function for inserting an operator, fixing the spacing around it
    static insOp(op) {
        const symb = this.symbols[op];
        if (this.syntax.symbolcat[op] >= 2) {
            this.autoChange(/\s+$/,'',' ' + symb + ' ',/^\s+/,'');
        } else {
            this.insertHere(symb);
        }
        // doesn't need to makechanged, since the others it calls always will
    }

    // stick a symbol right where the cursor is
    static insertHere(c) {
        let pos = this.selectionStart;
        this.setRangeText(c);
        this.focus();
        this.setSelectionRange(pos+1, pos+1);
        //trigger change
        if (this?.myline?.mysubderiv?.myprob.makeChanged) {
            this?.myline?.mysubderiv?.myprob.makeChanged(false, true);
        }
    }

    // function for handling keys; making many changes
    static keydown(e) {
        // register value on enter
        if (e.key == 'Enter') {
            e.preventDefault();
            // prettify the contents
            this.value = this.inputfix(this.value);
            // use blurHook to have blurring do other things
            if (this.blurHook) {
                this.blurHook(e);
            }
            if (this.enterHook) {
                this.enterHook(e);
                return;
            }
        }

        // tab/shift-tab can be assigned a special role, as in derivations
        if (e.key == 'Tab') {
            e.preventDefault();
            // prettify the result
            this.value = this.inputfix(this.value);
            if (e.shiftKey && this.shiftTabHook) {
                this.shiftTabHook(e);
                return;
            }
            if (this.tabHook) {
                this.tabHook(e);
                return;
            }
        }

        // arrows/shift arrows can be given special actions as in derivations
        if (e.key == 'ArrowUp' && this.arrowUpHook) {
            e.preventDefault();
            this.arrowUpHook(e);
            return;
        }
        if (e.key == 'ArrowDown' && this.arrowDownHook) {
            e.preventDefault();
            this.arrowDownHook(e);
            return;
        }
        if (e.key == 'ArrowLeft' && e.shiftKey && this.shiftArrowLeftHook) {
            e.preventDefault();
            this.shiftArrowLeftHook(e, true);
            return;
        }
        if (e.key == 'ArrowRight' && e.shiftKey && this.shiftArrowRightHook) {
            e.preventDefault();
            this.shiftArrowRightHook(e);
            return;
        }

        // these are only fired when at the start or end of input
        if (e.key == 'ArrowRight' && this.arrowRightHook) {
            if (this.selectionStart == this.value.length) {
                e.preventDefault();
                this.arrowRightHook(e);
                return;
            }
        }

        if (e.key == 'ArrowLeft' && this.arrowLeftHook) {
            if (this.selectionStart == 0) {
                e.preventDefault();
                this.arrowLeftHook(e);
                return;
            }
        }

        // other changes only apply when the field can actually be edited
        if (this.readOnly) { return; }

        // block extra spaces
        if (e.key == ' ') {
            if (/\s$/.test(this.value.substr(0,this.selectionStart))) {
                e.preventDefault();
                return;
            }
        }

        // v's and wedges become disjunctions
        if (e.key == 'v' || e.key == 'V' || e.key == '∨') {
            if (e.ctrlKey || e.metaKey) {
                return;
            }
            if (this.classList.contains('justification')) {
                return; 
            }
            e.preventDefault();
            this.insOp('OR');
            return;
        }

        // insert biconditional or conditional
        if (e.key == '>' || e.key == '→' || e.key == '⇒' ||
            e.key == '⊃') {
            e.preventDefault();

            // if there is soemthing of the form <-- before > make
            // it a biconditional
            if (/<-*$/.test(this.value.substr(0,this.selectionStart))) {
                this.autoChange(/\s*<[=-]*$/,'','',/^\s*/,'');
                this.insOp('IFF');
            } else {
                // o/w remove preceding hyphens and equals signs for -->
                this.autoChange(/\s*[=-]*$/,'','',/^\s*/,'');
                this.insOp('IFTHEN');
            }
            return;
        }

        if (e.key == '=') {
            // == becomes biconditional
            const before = this.value.substr(0, this.selectionStart);
            if (/=\s*$/.test(before)) {
                e.preventDefault();
                this.autoChange(/\s*=\s*$/,'','',/^\s*/,'');
                this.insOp('IFF');
                return;
            } else
            // /= becomes nonindentity
            if (/\/$/.test(this.value.substr(0,this.selectionStart))) {
                e.preventDefault();
                if (this.classList.contains('justification')) {
                    this.autoChange(/\/$/,'','≠',/^\s*/,'');
                } else {
                    this.autoChange(/\s*\/$/,' ','≠ ',/^\s*/,'');
                }
            // equal following = also nonindentity
            } else if (this.value[this.selectionStart -1] ==
                this.symbols.NOT) {
                e.preventDefault();
                if (this.classList.contains('justification')) {
                    const regex = new RegExp(this.symbols.NOT + '$');
                    this.autoChange(regex,'','≠',/^\s*/,'');
                } else {
                    const regex = new RegExp('\\s*' + this.symbols.NOT + '$');
                    this.autoChange(regex,' ','≠ ',/^\s*/,'');
                }
            }
            // } else if (!(this?.classList.contains('justification'))) {
            //     // regular = is padded with spaces, except when justifying
            //     e.preventDefault();
            //     this.autoChange(/\s*$/,' ','= ',/^\s*/,'');
            // }
        }

        // double ampersands = conjunction
        if (e.key == '&') {
            if (/&\s*/.test(this.value.substr(0, this.selectionStart))) {
                e.preventDefault();
                this.autoChange(/\s*&\s*$/,'','', null, null);
                this.insOp('AND');
                return;
            }
        }

        // insert conjunction
        if (e.key == '^' || e.key == '.' || e.key == '&' || e.key == '*' ||
            e.key == '•' || e.key == '·'  || e.key == '∧') {
            e.preventDefault();
            this.insOp('AND');
            return;
        }

        // negations
        if (e.key == '~' || e.key == '¬' || e.key == '!') {
            e.preventDefault();
            this.insOp('NOT');
            return;
        }

        // alternative biconditional
        if (e.key == '≡') {
            e.preventDefault();
            this.insOp('IFF');
            return;
        }

        // falsums
        if (e.key == '#' || e.key == '✖' || e.key == '×' || e.key == '_' ||
            e.key == '⊥' || e.key == '⨳' || e.key == '↯') {
            e.preventDefault();
            this.insOp('FALSUM');
            return;
        }

        // XX also becomes falsum
        if (e.key == 'X') {
            if ((this.selectionStart > 0) &&
                (this.value.at(this.selectionStart - 1) == 'X')) {
                e.preventDefault();
                this.autoChange(/\s*X$/, '', ' ' + this.symbols.FALSUM, null, null);
            }
            return;
        }

        if (e.key == '/') {
            // /= becomes nonindentity
            if (/=\s*$/.test(this.value.substr(0,this.selectionStart))) {
                e.preventDefault();
                if (this.classList.contains('justification')) {
                    this.autoChange(/=\s*$/,'','≠',/^\s*/,'');
                } else {
                    this.autoChange(/\s*=\s*$/,' ','≠ ',/^\s*/,'');
                }
            }

            // \/ becomes disjunction
            if ((this.selectionStart > 0) &&
                (this.value.at(this.selectionStart - 1) == '\\')) {
                e.preventDefault();
                this.autoChange(/\\$/, '', '', null, null);
                this.insOp('OR');
            }
            return;
        }

        // || becomes disjunction as well
        if (e.key == '|') {
            if ((this.selectionStart > 0) &&
                (this.value.at(this.selectionStart - 1) == '|')) {
                e.preventDefault();
                this.autoChange(/\|$/, '', '', null, null);
                this.insOp('OR');
            }
            return;
        }

        // hyphens not preceding '>' or numbers are negations?
        if (!(/[0-9?-]/.test(e.key)) &&
            (this.selectionStart > 0) &&
            (this.value.at(this.selectionStart - 1) == '-') &&
            e.key.length == 1) {
            const len = this.value.substr(0,this.selectionStart)
                .match(/-+$/g)[0].length;
            const nots = this.symbols.NOT.repeat(len);
            this.autoChange(/-+$/,'', nots, null, null);
        }

        // 'all' becomes ∀
        if ((e.key == 'l' || e.key == 'L') && 
            !this.classList.contains("justification")) {
            const before = this.value.substr(0, this.selectionStart);

            const textWithKey = before + e.key.toLowerCase();
            if (/all$/i.test(textWithKey)) {
                e.preventDefault();
                // gets rid of 'al'
                this.autoChange(/al$/i, '', '', /^\s*/, '');
                this.insOp('FORALL');
                return;
            }
        }
        // 'some' becomes ∃
        if ((e.key == 'e' || e.key == 'E') && 
            !this.classList.contains("justification")) {
            const before = this.value.substr(0, this.selectionStart);
            const textWithKey = before + e.key.toLowerCase();
            if (/some$/i.test(textWithKey)) {
                e.preventDefault();
                // get rid of 'som'
                this.autoChange(/som$/i, '', '', /^\s*/, '');
                this.insOp('EXISTS');
                return;
            }
        }

        if (this.pred) {
            // allow using A and E for predicates
            if (e.key == 's' || e.key == 'S') {
                if (this.value.at(this.selectionStart - 1) == '∀') {
                    e.preventDefault();
                    e.forallSwap = true;
                    this.autoChange(/∀$/,'A','s',null,null);
                }
            }
        }

        // lazy mode; lowercase letters become uppercase
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !this.pred &&
            !this.justify && this.lazy &&
            !this.classList.contains("justification")) {
            if (/^[a-z]$/.test(e.key)) {
                e.preventDefault();
                this.insertHere(e.key.toUpperCase());
            }
            return;
        }

        // process other keys that change the content
        if ((/^[A-Za-z0-9]$/.test(e.key)) || (e.key == 'Backspace') ||
            (e.key == 'Delete')) {
            if (this?.myline?.mysubderiv?.myprob.makeChanged) {
                this?.myline?.mysubderiv?.myprob.makeChanged(false, true);
            }
        }
    }
}

// add insert widget to the window element
function makeSymbolWidget() {
    if (window && document) {
        if (window.symbolwidget) {
            return window.symbolwidget;
        }

        const symbolwidget = document.createElement("div");
        window.symbolwidget = symbolwidget;
        symbolwidget.classList.add("symbolinsertwidget",
            "symbolic", "logicpenguin");
        symbolwidget.syntax = getSyntax();
        symbolwidget.symbols = symbolwidget.syntax.symbols;
        const symbols = symbolwidget.symbols;

        // create buttons for each symbol
        symbolwidget.buttonfor = {};
        const table = addelem('table',symbolwidget,{});
        const tbody = addelem('tbody',table,{});
        const tre = addelem('tr',tbody,{});
        for (const op in symbols) {
            const td = addelem('td', tre, {});
            symbolwidget.buttonfor[op] = td;
            td.myWidget = symbolwidget;
            td.myOp = op;
            const isQuantifier = (op === 'FORALL' || op === 'EXISTS');
            const quantText = `(${symbols[op]}x)`;
            td.innerHTML = htmlEscape(isQuantifier ? quantText : symbols[op]);
            td.title = htmlEscape('Insert ' + (isQuantifier ? quantText : symbols[op]));
            td.tabIndex = -1;
            td.classList.add('symbolwidgetbutton');
            // prevent it from unfocusing the input field
            td.onmousedown = function(e) {
                e.preventDefault();
            }
            td.onpointerdown = function(e) {
                e.preventDefault();
            }
            td.onclick = function(e) {
                if (!this?.myWidget?.targetInput) { return; }
                if (isQuantifier) {
                    const target = symbolwidget.targetInput;
                    const start = target.selectionStart ?? target.value.length;
                    const end = target.selectionEnd ?? start;
                    target.setRangeText(quantText, start, end, 'end');
                    const newPos = start + quantText.length;
                    target.focus();
                    target.setSelectionRange(newPos, newPos);
                    if (target?.myline?.mysubderiv?.myprob.makeChanged) {
                        target.myline.mysubderiv.myprob.makeChanged(false, true);
                    }
                } else {
                    symbolwidget.targetInput.insOp(td.myOp);
                }
                // note: insOp will trigger makeChanged
            };
        }
        const nitd = addelem('td', tre, {});
        symbolwidget.buttonfor.NONIDENTITY = nitd;
        nitd.myWidget = symbolwidget;
        nitd.myOp = 'NONIDENTITY';
        nitd.innerHTML = '≠';
        nitd.title = 'Insert ≠';
        nitd.tabIndex = -1;
        nitd.classList.add('symbolwidgetbutton');
        nitd.onmousedown = function(e) {
            e.preventDefault();
        }
        nitd.onpointerdown = function(e) {
            e.preventDefault();
        }
        nitd.onclick = function(e) {
            if (!this?.myWidget?.targetInput) { return; }
            if (this?.myWidget?.targetInput?.classList?.contains('justification')) {
                symbolwidget.targetInput.autoChange(/ $/,' ','≠',/^\s*/,'');
            } else {
                symbolwidget.targetInput.autoChange(/\s*$/,' ','≠ ',/^\s*/,'');
            }
        }
        // function to show up for a given input; may have options to
        // show or hide falsum, or show or hide quantifier symbols
        symbolwidget.showfor = function(elem) {
            // no-op: shortcuts are handled inline; avoid floating widget
            return;
        }

        // hide it when not in use by removing from DOM
        symbolwidget.hide = function() {
            this.targetInput = false;
            if (this.parentNode) {
                this.parentNode.removeChild(this);
            }
        }
        return symbolwidget;
    }
    // no window or document element, return null
    return null;
}
