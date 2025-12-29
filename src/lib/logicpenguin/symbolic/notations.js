// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// notations.js ///////////////////////////
// This app uses a single notation: Hurley.           //
///////////////////////////////////////////////////////////

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
    }
}

export default notations;
