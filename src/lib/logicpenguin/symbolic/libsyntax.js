// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// libsyntax.js ////////////////////////
// defines a function that can be used to generate a    //
// "syntax" object for an appropriate notation          //
//////////////////////////////////////////////////////////

import notations from './notations.js';

const DEFAULT_NOTATION = 'hurley';
const syntaxes = {};

const subscriptDigits = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
};

// adicities for operators
const symbolcat = {
    OR      : 2,
    AND     : 2,
    IFTHEN  : 2,
    IFF     : 2,
    NOT     : 1,
    FORALL  : 1,
    EXISTS  : 1,
    FALSUM  : 0
}


// tests if the character is a binary operator
function isbinaryop(c) {
    return (this.isop(c) && (symbolcat[this.operators[c]] == 2));
}

// tests if the character is a monadic operator
function ismonop(c) {
    return (this.isop(c) && (symbolcat[this.operators[c]] == 1));
}

// tests if a single character is a quantifier symbol;
// note this is the just the symbols, without the variable or parentheses
function isquant(c) {
    return (c == this.symbols.FORALL || c == this.symbols.EXISTS);
}

// tests if a character is a propositional constant/zero-place operator
function ispropconst(c) {
    return (this.isop(c) && (symbolcat[this.operators[c]] == 0));
}

// check if symbols is an operator
function isop(c) {
    return (c in this.operators);
}

// tests if a given character is a variable
function isvar(c) {
    return this.varaRegEx.test(c);
}

// this: make quantifier with proper notation
function mkquantifier(v, q) {
    // determine whether or not to use parentheses for quantifiers
    const useParens = (this.notation.quantifierForm.charAt(0) == '(');
    // determine whether the universal quantifier is hidden
    const hideUniv = (this.notation.quantifierForm.search('Q\\?') >= 0);
    // by default we have a quantifier and variale
    let r = q + v;
    // remove quantifier if it is universal and no quantifier
    // symbol is used
    if (hideUniv && q == this.symbols.FORALL) {
        r = v;
    }
    // add parentheses if appropriate
    if (useParens) {
        r = '(' + r + ')';
    }
    //return result
    return r;
}

function mkuniversal(v) {
    return this.mkquantifier(v, this.symbols.FORALL);
}

function mkexistential(v) {
    return this.mkquantifier(v, this.symbols.EXISTS);
}

// Carnap-style canonicalization: indexed symbols are stored as E_1, while
// pasted/displayed Unicode forms such as E₁ and E₁₂ remain valid input.
function normalizeSubscriptIndices(s) {
    return String(s ?? '').replace(/([A-Za-z])_?([₀-₉]+)/g,
        (_match, letter, digits) => letter + '_' + Array.from(digits)
            .map((digit) => subscriptDigits[digit])
            .join(''));
}

function symbolfix(s) {
    let rv = String(s ?? '');
    rv = rv.replace(/[\uFE0E\uFE0F]/g, '');
    if (this.notationname === 'calgary') {
        rv = normalizeSubscriptIndices(rv);
    }

    rv = rv.replace(/-->/g, this.symbols.IFTHEN);
    rv = rv.replace(/<->/g, this.symbols.IFF);
    rv = rv.replace(/<–>/g, this.symbols.IFF);
    rv = rv.replace(/<=>/g, this.symbols.IFF);
    rv = rv.replace(/->/g, this.symbols.IFTHEN);
    rv = rv.replace(/–>/g, this.symbols.IFTHEN);
    rv = rv.replace(/=>/g, this.symbols.IFTHEN);
    rv = rv.replace(/>/g, this.symbols.IFTHEN);
    rv = rv.replace(/\/\\/g, this.symbols.AND);
    rv = rv.replace(/\\\//g, this.symbols.OR);
    rv = rv.replace(/[&^∧•·]/g, this.symbols.AND);
    rv = rv.replace(/[|]/g, this.symbols.OR);
    rv = rv.replace(/[↔≡]/g, this.symbols.IFF);
    rv = rv.replace(/[→⇒⊃]/g, this.symbols.IFTHEN);
    rv = rv.replace(/[~¬]/g, this.symbols.NOT);
    rv = rv.replace(/[⊥✖]/g, this.symbols.FALSUM);
    return rv;
}

// changes to input string you'd be all right applying even to
// input fields, here we remove redundant spaces
function inputfix(s) {
    // remove spaces and convert plaintext shorthands to the active notation
    let rv = this.symbolfix(String(s ?? '').replace(/\s/g,''));

    // accept lowercase "v" as a disjunction when used infix (e.g., CvM -> C∨M)
    rv = rv.replace(/([A-Za-z0-9_)\]\}])v([A-Za-z(\[\{])/g,
        `$1${this.symbols.OR}$2`);
    rv = rv.replace(/\ball\b/gi, this.symbols.FORALL); // 'all' becomes ∀
    rv = rv.replace(/\bsome\b/gi, this.symbols.EXISTS); // 'some' becomes ∃ 
    rv = rv.replace(/==/g, this.symbols.IFF); // '==' becomes ≡
    
    // spaces only surround binary operators …
    for (const op in symbolcat) {
        if (symbolcat[op] == 2) {
            rv = rv.replaceAll(this.symbols[op],
                ' ' + this.symbols[op] + ' ');
        }
    }
    // … and identity
    rv = rv.replaceAll('=',' = ');
    rv = rv.replaceAll('≠',' ≠ ');
    return rv;
}

function stripmatching(s) {
    if (s.length < 2) { return s; }

    // A leading quantifier is part of the formula, not a removable pair of
    // grouping parentheses. In Calgary, however, an atomic term list such as
    // the `(x)` in F(x) must be stripped normally.
    const qMatch = s.match(this.qaRegEx);
    if (qMatch) { return s;}
    
    const openBrackets = { '(': ')', '[': ']', '{': '}' };
    const closeBrackets = { ')': '(', ']': '[', '}': '{' };
    
    // track matching brackets/braces/parentheses 
    const stack = [];
    for (let i=0; i< (s.length - 1); i++) {
        const c = s[i];
        if (openBrackets[c]) {
            stack.push(c);
        } else if (closeBrackets[c]) {
            if (stack.length == 0 || stack.pop() != closeBrackets[c]) { return s; }
        }

        if (stack.length == 0) { return s; }
    }
    const first = s[0];
    const last = s.at(-1);
    if (openBrackets[first] && last == openBrackets[first] && 
        stack.length == 1 && stack[0] == first) {
        // matching? return strip recursively
        return this.stripmatching(s.substring(1, s.length - 1));
    }
    // not well formed here but oh well
    return s;
}

//////////// Main function for generating new syntax
function generateSyntax(notationname = DEFAULT_NOTATION) {
    // initialize return value
    const syntax = {};

    syntax.notationname = notationname in notations ? notationname : DEFAULT_NOTATION;
    syntax.notation = notations[syntax.notationname];

    // symbols are those things in notation also in symbolcat
    const symbols = {}
    for (let sym in syntax.notation) {
        if (sym in symbolcat) { symbols[sym] = syntax.notation[sym]; }
    }
    syntax.symbols = symbols;

    // reverse list of symbols to get operators
    const operators = Object.fromEntries(
        Object.entries(symbols).map(([x,y]) => ([y,x])));
    syntax.operators = operators;
    //
    // Syntax Regular Expressions (RegExp)
    //

    // Accept both explicit quantifier styles in every notation, then render
    // with quantifierForm. The variable-only universal abbreviation `(x)` is
    // Hurley-specific; treating it as a quantifier in Calgary breaks F(x).
    const indexedSuffix = syntax.notationname === 'calgary'
        ? '(?:_[1-9][0-9]*)?'
        : '';
    const variablePattern = '[' + syntax.notation.variableRange + ']' +
        indexedSuffix;
    const constantPattern = '[' + syntax.notation.constantsRange + ']' +
        indexedSuffix;
    const termPattern = '[' + syntax.notation.variableRange +
        syntax.notation.constantsRange + ']' + indexedSuffix;
    const baseForm = syntax.notation.quantifierForm
        .replaceAll('(', '').replaceAll(')', '')
        .replaceAll('Q?',symbols.EXISTS + '?')
        .replaceAll('Q','[' + symbols.EXISTS + symbols.FORALL + ']')
        .replaceAll('x', variablePattern);
    const acceptedForms = ['\\(' + baseForm + '\\)', baseForm];
    if (syntax.notationname === 'hurley') {
        acceptedForms.push('\\([' + syntax.notation.variableRange + ']\\)');
    }
    syntax.qRegExStr = '(?:' + acceptedForms.join('|') + ')';

    // regular quantifier regex
    syntax.qRegEx = new RegExp(syntax.qRegExStr);
    // global version
    syntax.gqRegEx = new RegExp(syntax.qRegExStr, 'g');
    // anchored to start
    syntax.qaRegEx = new RegExp('^' + syntax.qRegExStr);
    // variable regex
    syntax.varRegEx = new RegExp(variablePattern);
    // variable regex, anchored
    syntax.varaRegEx = new RegExp('^' + variablePattern + '$');
    // terms regex
    syntax.termsRegEx = new RegExp(termPattern, 'g');
    syntax.termaRegEx = new RegExp('^' + termPattern + '$');
    // Fitch/Calgary predicate and propositional symbols may carry a numeric
    // index. Other course notations retain their original atomic grammar.
    const indexedPredicateRange = syntax.notation.predicatesRange
        .replaceAll('=', '').replaceAll('≠', '');
    syntax.pletterRegEx = new RegExp(
        '(?:[=≠]|[' + indexedPredicateRange + ']' + indexedSuffix + ')'
    );
    // constants regex
    syntax.cRegEx = new RegExp('^' + constantPattern + '$');

    // BIND SYNTAX FUNCTIONS TO THIS SYNTAX
    syntax.symbolfix = symbolfix;
    syntax.normalizeSubscriptIndices = normalizeSubscriptIndices;
    syntax.inputfix = inputfix;
    syntax.isbinaryop = isbinaryop;
    syntax.ismonop = ismonop;
    syntax.isquant = isquant;
    syntax.ispropconst = ispropconst;
    syntax.isop = isop;
    syntax.isvar = isvar;
    syntax.mkquantifier = mkquantifier;
    syntax.mkuniversal = mkuniversal;
    syntax.mkexistential = mkexistential;
    syntax.stripmatching = stripmatching;
    syntax.symbolcat = symbolcat;
    return syntax;
}
//
// EXPORTED FUNCTION
//
// returns the app's (single) syntax object
export default function getSyntax(notationname = DEFAULT_NOTATION) {
    const selectedNotation = notationname in notations ? notationname : DEFAULT_NOTATION;
    if (syntaxes[selectedNotation]) {
        return syntaxes[selectedNotation];
    }
    syntaxes[selectedNotation] = generateSyntax(selectedNotation);
    return syntaxes[selectedNotation];
}
