// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// notations.js ///////////////////////////
// This app supports the course notation selected by logic_system. //
///////////////////////////////////////////////////////////

const notations = {
    calgary: {
        OR      : '∨',
        AND     : '∧',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '⊥',
        constantsRange: 'a-r',
        predicatesRange: '=≠A-Z',
        quantifierForm: 'Qx',
        schematicLetters: '𝒜𝒜𝓍𝒸𝒸',
        useTermParensCommas: true,
        variableRange: 'x-zs-w'
    },
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
        quantifierForm: '(Qx)',
        schematicLetters: '𝒜𝒜𝓍𝒶𝓃',
        useTermParensCommas: false,
        variableRange: 'x-z'
    },
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
