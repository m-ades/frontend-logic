// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-hurley.js //////////////////////////////
// Kalish-Montague style derivations using Hurley's rule set       //
////////////////////////////////////////////////////////////////////////

import LogicPenguinProblem from '../problem-class.js';
import DerivationExercise from './derivation-base.js';
import { addelem, htmlEscape } from '../common.js';

// TODO: perhaps rebase on derivation-km-base.js and allow any ruleset?
import getRules from '../checkers/rules/hurley-rules.js';

export default class DerivationHurley extends DerivationExercise {

  constructor() {
    super();
    this.isLPReady = false;
    this._isRestoring = false;
    this._stateChangeHooksInstalled = false;
  }

  connectedCallback() {
    // call parent connectedCallback if it exists (custom elements use super)
    if (super.connectedCallback) {
      super.connectedCallback();
    }

    // oly emit ready if not already ready (to avoid duplicate events)
    if (!this.isLPReady) {
      this.isLPReady = true;
      this.dispatchEvent(new Event("LP-ready", { bubbles: false }));
    }

  }

  /**
   load new derivation problem 
   */
  loadProblem(problem, options = {}) {
    const finalOptions = Object.assign(
      {
        checklines: true,
        pred: false,
        identity: false,
      },
      options
    );
    this.innerHTML = "";
    this.makeProblem(problem, finalOptions, "submit answer"); // logicpenguin api for now
    this.myproblemtype = "derivation-hurley";
    this.myquestion = problem;
    this.myanswer = null; // match model solution later
  }

  async checkLines() {
    if (!this.options.checklines) return;
    
    this.markLinesAsChecking();
    
    const { default: hurleyDerivCheck } = 
        await import('../checkers/derivation-hurley.js');
    
    const ind = await hurleyDerivCheck(
      this.myquestion,
      this.getAnswer(),
      -1,
      this.options
    );
    
    ind.successstatus = 'edited';
    ind.savedstatus = 'unsaved';
    ind.fromautocheck = true;
    
    if (!this._isRestoring) {
      this.setIndicator(ind);
    }
  }

  //restore a previously saved state snapshot, wrap restoreState
  setStateSnapshot(savedState) {
    if (!savedState || typeof this.restoreState !== "function") return;
    this._isRestoring = true;
    try {
      this.restoreState(savedState);
    } finally {
      this._isRestoring = false;
    }
  }

  addSubDerivHook(subderiv) {
    const l = subderiv.addLine(subderiv.target, true);
    if (!this.isRestoring && !this.settingUp) {
      l.input.focus();
    }
  }

  getAnswer() {
    return super.getAnswer();
  }

  getSolution() {
    return super.getSolution();
  }

  // in justifications, certain letters auto-uppercase
  justKeydownExtra(e, elem) {
    if (e.ctrlKey || e.altKey) { return; }
  }

  makeProblem(problem, options, checksave) {
    this.rules = getRules();
    this.ruleset = this.rules;
    this.schematicLetters = '𝒜𝒜𝓍𝒶𝓃';
    this.schematic = ((s) => (DerivationHurley.schematic(s, this.schematicLetters)));
    this.useShowLines = true;
    // different icon for adding subderivation
    this.icons.addsubderiv = 'variable_add';
    super.makeProblem(problem, options, checksave);
  }


  static schematic(s, letters) {
    const lta = [...letters];
    const scA = lta[0];
    let scB = 'ℬ';
    let scC = '𝒞';
    if (scA == 'p') {
      scB = 'q';
      scC = 'r';
    }
    if (scA == '𝑨') {
      scB = '𝑩';
      scC = '𝑪';
    }
    if (scA == 'φ') {
      scB = 'ψ';
      scC = 'χ';
    }
    const scx = lta[2];
    const sca = lta[3];
    const scn = lta[4];
    let scb = '𝒷';
    if (sca == '𝒄') {
      scb = '𝒅';
    }
    if (sca=='𝒸') {
      scb = '𝒹';
    }
    if (/[ab] [=≠] [ba]/.test(s)) {
      return s.replace(/a/g, sca)
        .replace(/b/g, scb);
    }
    if (s == 'a') {
      return sca;
    }
    if (s == 'b') {
      return scb;
    }
    return s.replace(/Ax/g, scA + scx)
      .replace(/A/g, scA)
      .replace(/B/g, scB)
      .replace(/C/g, scC)
      .replace(/x/g, scx)
      .replace(/a/g,' [' + sca + '/' + scx + ']')
      .replace(/b/g,' [' + scb + '/' + scx + ']')
      .replace(/d/g,' [' + scb + '/' + scx + ']')
      .replace(/n/g,' [' + scn + '/' + scx + ']');
  }

  static sampleProblemOpts(opts) {
    let [parentid, problem, answer, restore, options] =
      LogicPenguinProblem.sampleProblemOpts(opts);

    // if no problem, try to reconstruct from answer
    if ((problem === null) && answer) {
      problem = { prems: [], conc: '' };
      // go through parts of main derivation in answer
      for (const pt of answer?.parts) {
        // put premises in problem.prems
        if (("j" in pt) && (pt.j == 'Pr') && ("s" in pt)) {
          problem.prems.push(pt.s);
        }
        if (("parts" in pt) && ("showline" in pt) &&
            ("s" in pt.showline)) {
          problem.conc = pt.showline.s;
          break;
        }
      }
    }

    // partial problems treated differently
    const partial = (!!answer?.partial);
    if ((!("checklines" in options)) || (options.checklines === null)) {
      options.checklines = true;
    }
    // if lowercase letter in conclusion, then it's predicate logic
    if (((!("pred" in options)) || (options.pred === null)) &&
        (/[a-z]/.test( problem.conc ))) {
      options.pred = true;
    } else {
      options.lazy = true;
    }
    // if partial, restore what was given as "answer"
    if (partial && (restore === null) && answer) {
      restore = answer;
    }
    return [parentid, problem, answer, restore, options];
  }

}

// only register if not already registered (prevents HMR errors)
if (!customElements.get("derivation-hurley")) {
  customElements.define("derivation-hurley", DerivationHurley);
}
