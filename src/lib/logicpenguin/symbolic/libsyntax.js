// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// libsyntax.js ////////////////////////
// defines a function that can be used to generate a    //
// "syntax" object for an appropriate notation          //
//////////////////////////////////////////////////////////

import notations from './notations.js';

const DEFAULT_NOTATION = 'hurley';
let cachedSyntax = null;

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
    return this.varRegEx.test(c);
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

// changes to input string you'd be all right applying even to
// input fields, here we remove redundant spaces
function inputfix(s) {
    // remove spaces
    let rv = s.replace(/\s/g,'');
    
    
    // convert plaintext shorthands to Hurley's notation
    rv = rv.replace(/-->/g, this.symbols.IFTHEN);
    rv = rv.replace(/->/g, this.symbols.IFTHEN);
    if (this.symbols.AND != '&') {
        rv = rv.replace(/&/g, this.symbols.AND);
    }
    if (this.symbols.AND != '^') {
        rv = rv.replace(/\^/g, this.symbols.AND);
    }
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

    const qMatch = s.match(/^\(?[∃∀][x-z]\)?/);
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
function generateSyntax() {
    // initialize return value
    const syntax = {};

    syntax.notation = notations[DEFAULT_NOTATION];
    syntax.notationname = DEFAULT_NOTATION;

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

    // generate regex description for quantifiers from
    // quantifierForm
    // allow parentheses around quantifiers
    let baseForm = syntax.notation.quantifierForm
        .replaceAll('(',"\\(").replaceAll(')',"\\)")
        .replaceAll('Q?',symbols.EXISTS + '?')
        .replaceAll('Q','[' + symbols.EXISTS + symbols.FORALL + ']')
        .replaceAll('x','[' + syntax.notation.variableRange + ']');

    if (!syntax.notation.quantifierForm.includes('(')) {
        // Also allow (x) as a valid quantifier (equivalent to (∀x) in Hurley's notation)
        const varOnlyForm = '\\(' + '[' + syntax.notation.variableRange + ']' + '\\)';
        syntax.qRegExStr = '(?:\\(' + baseForm + '\\)|' + baseForm + '|' + varOnlyForm + ')';
    } else {
        syntax.qRegExStr = baseForm;
    }

    // regular quantifier regex
    syntax.qRegEx = new RegExp(syntax.qRegExStr);
    // global version
    syntax.gqRegEx = new RegExp(syntax.qRegExStr, 'g');
    // anchored to start
    syntax.qaRegEx = new RegExp('^' + syntax.qRegExStr);
    // variable regex
    syntax.varRegEx = new RegExp('[' + syntax.notation.variableRange + ']');
    // variable regex, anchored
    syntax.varaRegEx = new RegExp('^[' + syntax.notation.variableRange + ']$');
    // terms regex
    syntax.termsRegEx = new RegExp('[' + syntax.notation.variableRange +
        syntax.notation.constantsRange + ']', 'g');
    // predicate letter/ propositional letter regEx
    syntax.pletterRegEx = new RegExp ('[' + syntax.notation
        .predicatesRange + ']');
    // constants and nonconstants regexex
    syntax.cRegEx = new RegExp('^[' + syntax.notation.constantsRange + ']$');
    syntax.ncRegEx = new RegExp( '[^' + syntax.notation.constantsRange + ']', 'g');

    // BIND SYNTAX FUNCTIONS TO THIS SYNTAX
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
export default function getSyntax() {
    if (cachedSyntax) {
        // regenerate if notation has changed (e.g., updated ranges)
        if (cachedSyntax?.notation?.predicatesRange?.includes('a')) {
            return cachedSyntax;
        }
    }
    cachedSyntax = generateSyntax();
    return cachedSyntax;
}
