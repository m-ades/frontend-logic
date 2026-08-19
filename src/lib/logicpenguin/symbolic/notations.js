// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// notations.js ///////////////////////////
// Textbook glyph tables. Add a key here and pass that
// name to getSyntax() / the keyboard `notation` prop.
///////////////////////////////////////////////////////////

const cambridge = {
    OR      : '∨',
    AND     : '∧',
    IFTHEN  : '→',
    IFF     : '↔',
    NOT     : '¬',
    FORALL  : '∀',
    EXISTS  : '∃',
    FALSUM  : '⊥',
    constantsRange: 'a-w',
    predicatesRange: '=≠A-Z',
    quantifierForm: 'Qx',
    schematicLetters: '𝒜𝒜𝓍𝒶𝓃',
    useTermParensCommas: false,
    variableRange: 'x-z'
}

const notations = {
    hurley: {
        OR      : '∨',
        AND     : '•',
        IFTHEN  : '⊃',
        IFF     : '≡',
        NOT     : '~',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '✖',
        constantsRange: 'a-w',
        predicatesRange: '=≠A-Z',
        quantifierForm: 'Qx',
        schematicLetters: '𝒜𝒜𝓍𝒶𝓃',
        useTermParensCommas: false,
        variableRange: 'x-z'
    },
    cambridge,
    forallx: cambridge,
    nonclassical: {
        OR      : 'V',
        AND     : '&',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '~',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '✖',
        constantsRange: 'a-w',
        predicatesRange: '=≠A-Za-zΑ-Ωα-ω',
        quantifierForm: 'Qx',
        schematicLetters: '𝒜𝒜𝓍𝒶𝓃',
        useTermParensCommas: false,
        variableRange: 'x-z'
    }
}

export default notations;
