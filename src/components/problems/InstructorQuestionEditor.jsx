import * as React from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { fetchJson } from '../../utils/api.js'
import {
  DEFAULT_LOGIC_SYSTEM,
  isDerivationProblemType,
  normalizeLogicSystem,
} from '../../lib/logicSystems.js'
import {
  getAssumptionRuleRequirements,
  getJustificationRule,
  parseAssumptionScopes,
} from '../../lib/proofArgumentExtractionScopes.js'
import { getInstructorProblemTypeLabel, isInstructorProblemType } from '../../lib/instructorProblemTypes.js'
import { isMultiSelectSubquestion } from '../../lib/logicpenguin/multiple-choice-utils.js'
import { deepMerge } from './instructor-question-editor/snapshotUtils.js'
import { validateQuestionSnapshotFormulas } from './instructor-question-editor/snapshotValidation.js'
import { validateDerivationRuleset } from './instructor-question-editor/ruleHelpers.js'
import { AttemptLimitField } from './instructor-question-editor/AttemptLimitField.jsx'
import { McEditorForm, buildMcSnapshot } from './instructor-question-editor/McEditor.jsx'
import { TruthTableEditorForm, buildTruthTableSnapshot } from './instructor-question-editor/TruthTableEditor.jsx'
import { IndirectTruthTableEditorForm, buildIndirectTruthTableSnapshot } from './instructor-question-editor/IndirectTruthTableEditor.jsx'
import { NonClassicalTruthTableEditorForm, buildNonClassicalTruthTableSnapshot } from './instructor-question-editor/NonClassicalTruthTableEditor.jsx'
import { DerivationEditorForm, buildDerivationSnapshot } from './instructor-question-editor/DerivationEditor.jsx'
import { ProofArgumentExtractionEditorForm, buildProofArgumentExtractionSnapshot } from './instructor-question-editor/ProofArgumentExtractionEditor.jsx'
import { EvaluateTruthEditorForm, buildEvaluateTruthSnapshot } from './instructor-question-editor/EvaluateTruthEditor.jsx'
import { SymbolicTranslationEditorForm, buildSymbolicTranslationSnapshot } from './instructor-question-editor/SymbolicTranslationEditor.jsx'
import { SingleRowTruthTableEditorForm, buildSingleRowTruthTableSnapshot } from './instructor-question-editor/SingleRowTruthTableEditor.jsx'
import { PartialTruthTableEditorForm, buildPartialTruthTableSnapshot } from './instructor-question-editor/PartialTruthTableEditor.jsx'
import { ComboPromptEditorForm, ComboTruthTableEditorForm, buildComboSnapshot } from './instructor-question-editor/ComboEditors.jsx'

function InstructorQuestionEditorInner({
  proof,
  isInstructorView,
  onSaved,
  onCreated,
  assignmentId,
  orderIndex,
  mode = 'edit',
  trigger = 'button',
  forwardedRef,
  logicSystem,
}) {
  const [open, setOpen] = React.useState(false)
  const [editValue, setEditValue] = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const initialEditValueRef = React.useRef(null)

  const questionId = proof?.questionId
  const questionAssignmentId = assignmentId ?? proof?.assignmentId
  const supported = proof?.type && isInstructorProblemType(proof.type)
  const isCreate = mode === 'create'
  const canDelete = !isCreate && questionId != null && questionAssignmentId != null
  const activeLogicSystem = proof?.type === 'derivation-hurley'
    ? 'hurley'
    : normalizeLogicSystem(logicSystem ?? proof?.logicSystem, DEFAULT_LOGIC_SYSTEM)

  const handleOpen = React.useCallback(() => {
    const base = { attemptLimit: proof?.attemptLimit ?? 3 }
    if (proof?.type === 'multiple-choice') {
      const mc = proof.multipleChoice || {}
      const snapshot = proof.questionSnapshot || {}
      base.prompt = mc.prompt ?? proof.description ?? ''
      base.choices = Array.isArray(mc.choices) ? [...mc.choices] : []
      const savedAnswerIndices = Array.isArray(mc.answerIndices)
        ? [...mc.answerIndices]
        : (Array.isArray(snapshot.answerIndices) ? [...snapshot.answerIndices] : (Array.isArray(proof.answer) ? [...proof.answer] : []))
      if (savedAnswerIndices.length > 1) base.answerIndices = savedAnswerIndices
      base.answerIndex = Array.isArray(proof.answer) ? proof.answer[0] ?? 0 : proof.answer ?? 0
      if (Array.isArray(mc.subquestions) && mc.subquestions.length > 0) {
        base.subquestions = mc.subquestions.map((subq) => ({
          ...(subq && typeof subq === 'object' ? subq : {}),
          prompt: subq?.prompt ?? '',
          choices: Array.isArray(subq?.choices) ? [...subq.choices] : [],
          answerIndex: Number(subq?.answerIndex ?? subq?.answer ?? 0),
        }))
      }
    }
    if (proof?.type === 'symbolic-translation') {
      const tr = proof.translation || {}
      base.prompt = proof.description ?? tr.prompt ?? ''
      base.sentence = tr.sentence ?? ''
      base.symbolizationKey = Array.isArray(tr.symbolizationKey) ? [...tr.symbolizationKey] : []
      base.answer = tr.answer ?? proof.answer ?? ''
    }
    if (proof?.type === 'truth-table') {
      const tt = proof.truthTable || {}
      const rawOpts = proof?.questionSnapshot?.truthTable?.options ?? proof?.questionSnapshot?.truth_table?.options
      const opts = rawOpts ?? tt.options ?? proof.options ?? {}
      base.prompt = tt.prompt ?? proof.description ?? ''
      base.kind = tt.kind ?? 'formula'
      base.statement = tt.statement ?? tt.formula ?? ''
      base.right = tt.right ?? ''
      base.lefts = Array.isArray(tt.lefts) ? [...tt.lefts] : []
      if (base.kind === 'equivalence') {
        const statements = Array.isArray(tt.statements)
          ? [...tt.statements]
          : [tt.left ?? '', tt.right ?? '']
        while (statements.length < 2) statements.push('')
        base.statements = statements
      }
      base.partialCredit = opts.partialCredit ?? opts.partialcredit ?? opts.partial_credit ?? Boolean(proof.partialCredit)
      base.classificationQuestion = opts.question ?? false
      base.mainOperatorHighlight = opts.highlightMainOperator ?? false
    }
    if (proof?.type === 'indirect-truth-table') {
      const itt = proof.indirectTruthTable || {}
      base.prompt = itt.prompt ?? proof.description ?? ''
      base.argument = itt.argument ? { ...itt.argument } : {}
      base.questions = Array.isArray(itt.questions) ? itt.questions.map((q) => ({ ...q })) : (Array.isArray(itt.subquestions) ? itt.subquestions.map((q) => ({ ...q })) : [])
      base.partialCredit = Boolean(proof.partialCredit)
    }
    if (proof?.type === 'nonclassical-truth-table') {
      const nctt = proof.nonclassicalTruthTable || {}
      base.prompt = nctt.prompt ?? proof.description ?? ''
      base.argument = nctt.argument ? { ...nctt.argument } : {}
      base.questions = Array.isArray(nctt.questions) ? nctt.questions.map((q) => ({ ...q })) : (Array.isArray(nctt.subquestions) ? nctt.subquestions.map((q) => ({ ...q })) : [])
      base.truthValueToggle = Array.isArray(nctt.truthValueToggle) ? [...nctt.truthValueToggle] : ['T', 'F', 'N']
      base.partialCredit = Boolean(proof.partialCredit)
    }
    if (isDerivationProblemType(proof?.type)) {
      base.prompt = proof.description ?? ''
      base.premises = Array.isArray(proof.premises) ? [...proof.premises] : (Array.isArray(proof.prems) ? [...proof.prems] : [])
      base.conclusion = proof.conclusion ?? proof.conc ?? ''
      base.ruleset = {
        ...(proof.ruleset && typeof proof.ruleset === 'object' ? proof.ruleset : {}),
      }
    }
    if (proof?.type === 'evaluate-truth') {
      base.statement = proof.evaluateTruth ?? proof.description ?? ''
      base.answer = proof.answer ?? false
    }
    if (proof?.type === 'single-row-truth-table') {
      const sr = proof.singleRowTruthTable || {}
      base.statement = sr.statement ?? sr.formula ?? proof.description ?? ''
      base.prompt = sr.prompt ?? proof.description ?? ''
      base.interpretation = typeof sr.interpretation === 'object' && sr.interpretation !== null ? { ...sr.interpretation } : {}
      base.row = Array.isArray(sr.row) ? [...sr.row] : undefined
      base.partialCredit = proof?.questionSnapshot?.partialCredit ?? Boolean(proof.partialCredit)
    }
    if (proof?.type === 'partial-truth-table') {
      const pt = proof.partialTruthTable || {}
      base.statement = pt.statement ?? pt.formula ?? proof.description ?? ''
      base.prompt = pt.prompt ?? proof.description ?? ''
      base.row = Array.isArray(pt.row) ? [...pt.row] : []
    }
    if (proof?.type === 'combo-translation-truth-table') {
      const snap = proof.comboTranslationTruthTable || proof.snapshot || {}
      base.prompt = snap.prompt ?? proof.description ?? ''
      const ans = proof.answer ?? snap.answer
      base.argumentLine = typeof ans === 'string' ? ans : ans?.argumentLine ?? ans?.argument ?? ''
    }
    if (proof?.type === 'combo-translation-derivation') {
      const snap = proof.comboTranslationDerivation || proof.snapshot || {}
      base.prompt = snap.prompt ?? proof.description ?? ''
      const ans = proof.answer ?? snap.answer
      base.argumentLine = typeof ans === 'string' ? ans : ans?.argumentLine ?? ans?.argument ?? ''
    }
    if (proof?.type === 'proof-argument-extraction') {
      const snap = proof.questionSnapshot || proof.snapshot || {}
      base.prompt = snap.prompt ?? proof.description ?? ''
      base.premises = Array.isArray(proof.premises) ? [...proof.premises] : [...(snap.prems || [])]
      base.lines = Array.isArray(proof.lines) ? [...proof.lines] : [...(snap.lines || [])]
      base.justifications = Array.isArray(proof.justifications)
        ? [...proof.justifications]
        : [...(snap.justifications || [])]
      const assumptionScopes = proof.assumptionScopes ?? snap.assumptionScopes
      base.assumptionScopes = Array.isArray(assumptionScopes)
        ? assumptionScopes.map((scope) => ({ ...scope }))
        : []
    }
    setEditValue(base)
    initialEditValueRef.current = JSON.parse(JSON.stringify(base))
    setError('')
    setOpen(true)
  }, [
    proof?.attemptLimit,
    proof?.type,
    proof?.description,
    proof?.answer,
    proof?.translation,
    proof?.multipleChoice,
    proof?.truthTable,
    proof?.indirectTruthTable,
    proof?.premises,
    proof?.prems,
    proof?.conclusion,
    proof?.conc,
    proof?.evaluateTruth,
    proof?.singleRowTruthTable,
    proof?.partialTruthTable,
    proof?.comboTranslationTruthTable,
    proof?.comboTranslationDerivation,
    proof?.lines,
    proof?.justifications,
    proof?.assumptionScopes,
    proof?.questionSnapshot,
    proof?.snapshot,
  ])

  React.useImperativeHandle(forwardedRef, () => ({
    open: handleOpen,
  }), [handleOpen])

  const handleSave = async () => {
    if (!isCreate && !questionId) return
    setSaving(true)
    setError('')
    try {
      const existingSnapshot = proof?.questionSnapshot ?? {}
      const existing = typeof existingSnapshot === 'object' && existingSnapshot !== null ? existingSnapshot : {}
      let question_snapshot
      if (proof.type === 'multiple-choice') {
        question_snapshot = buildMcSnapshot(proof, editValue, existing)
      } else if (proof.type === 'truth-table') {
        question_snapshot = buildTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'indirect-truth-table') {
        question_snapshot = buildIndirectTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'nonclassical-truth-table') {
        question_snapshot = buildNonClassicalTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (isDerivationProblemType(proof.type)) {
        question_snapshot = buildDerivationSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'evaluate-truth') {
        question_snapshot = buildEvaluateTruthSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'symbolic-translation') {
        question_snapshot = buildSymbolicTranslationSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'single-row-truth-table') {
        question_snapshot = buildSingleRowTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'partial-truth-table') {
        question_snapshot = buildPartialTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'combo-translation-truth-table') {
        question_snapshot = buildComboSnapshot(proof, editValue, existing, 'comboTranslationTruthTable', activeLogicSystem)
      } else if (proof.type === 'combo-translation-derivation') {
        question_snapshot = buildComboSnapshot(proof, editValue, existing, 'comboTranslationDerivation', activeLogicSystem)
      } else if (proof.type === 'proof-argument-extraction') {
        question_snapshot = buildProofArgumentExtractionSnapshot(proof, editValue, existing, activeLogicSystem)
      } else {
        setSaving(false)
        return
      }
      let mergedSnapshot = deepMerge(existing, question_snapshot)
      if (proof.type === 'single-row-truth-table') {
        delete mergedSnapshot.singleRowTruthTable
      }
      if (isDerivationProblemType(proof.type)) {
        const rulesetLogicSystem = proof.type === 'derivation-hurley' ? 'hurley' : activeLogicSystem
        const rulesetError = validateDerivationRuleset(editValue.ruleset ?? question_snapshot.ruleset, rulesetLogicSystem)
        if (rulesetError) {
          setError(rulesetError)
          setSaving(false)
          return
        }
      }
      if (proof.type === 'proof-argument-extraction') {
        const premises = Array.isArray(mergedSnapshot.prems) ? mergedSnapshot.prems : []
        const lines = Array.isArray(mergedSnapshot.lines) ? mergedSnapshot.lines : []
        if (premises.length === 0 || premises.some((formula) => !String(formula || '').trim())) {
          setError('Add at least one complete premise')
          setSaving(false)
          return
        }
        if (lines.length === 0 || lines.some((formula) => !String(formula || '').trim())) {
          setError('Add at least one complete proof line')
          setSaving(false)
          return
        }
        const { scopes, error: scopeError } = parseAssumptionScopes(
          mergedSnapshot.assumptionScopes,
          lines.length,
          activeLogicSystem
        )
        if (scopeError) {
          setError(scopeError)
          setSaving(false)
          return
        }
        const suppliedRules = (mergedSnapshot.justifications ?? []).map(getJustificationRule)
        const badRequirement = getAssumptionRuleRequirements(scopes, activeLogicSystem)
          .find(({ line, rules }) => (
            line >= lines.length || (suppliedRules[line] && !rules.includes(suppliedRules[line]))
          ))
        if (badRequirement) {
          const placement = badRequirement.kind === 'opening' ? 'begin with' : 'be followed by'
          setError(
            `Each assumption scope must ${placement} ${badRequirement.rules.join(' or ')}`
          )
          setSaving(false)
          return
        }
        // The update API deep-merges snapshots, so [] is the explicit clear value.
        mergedSnapshot.assumptionScopes = scopes
      }
      const formulaError = validateQuestionSnapshotFormulas(mergedSnapshot, activeLogicSystem)
      if (formulaError) {
        setError(`Invalid formula: ${formulaError}`)
        setSaving(false)
        return
      }
      if (proof.type === 'indirect-truth-table' || proof.type === 'nonclassical-truth-table') {
        const missingAnswer = (mergedSnapshot.questions ?? []).findIndex((question) => (
          isMultiSelectSubquestion(question) && !question.answerIndices?.length
        ))
        if (missingAnswer !== -1) {
          setError(`Select a correct answer for question ${missingAnswer + 1}`)
          setSaving(false)
          return
        }
      }
      const attemptLimit = editValue.attemptLimit

      if (isCreate) {
        if (!questionAssignmentId) {
          setError('Assignment id required')
          setSaving(false)
          return
        }
        const payload = {
          assignment_id: questionAssignmentId,
          order_index: Number.isFinite(Number(orderIndex)) ? Number(orderIndex) : 0,
          points_value: 100,
          attempt_limit: Number.isFinite(Number(attemptLimit)) ? Number(attemptLimit) : 3,
          question_snapshot: mergedSnapshot,
        }
        const created = await fetchJson('/api/assignment-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        setOpen(false)
        onCreated?.(created)
        return
      }

      const omitAttemptLimit = (v) => {
        const { attemptLimit: _, ...rest } = v || {}
        return rest
      }
      const formChanged =
        initialEditValueRef.current != null &&
        JSON.stringify(omitAttemptLimit(editValue)) !== JSON.stringify(omitAttemptLimit(initialEditValueRef.current))
      const body = {}
      if (attemptLimit !== undefined && Number.isFinite(Number(attemptLimit))) {
        body.attempt_limit = Number(attemptLimit)
      }
      if (formChanged) {
        body.question_snapshot = mergedSnapshot
      }
      if (Object.keys(body).length === 0) {
        setSaving(false)
        return
      }
      await fetchJson(`/api/assignment-questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setOpen(false)
      onSaved?.(questionId)
    } catch (err) {
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete || saving) return
    if (!window.confirm('Delete this question? This cannot be undone.')) return
    setSaving(true)
    setError('')
    try {
      if (questionAssignmentId == null) throw new Error('Assignment id required')
      await fetchJson('/api/assignment-questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: questionAssignmentId, ids: [questionId] }),
      })
      setOpen(false)
      onSaved?.(questionId)
    } catch (err) {
      setError(err?.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  if (!isInstructorView || !supported) return null

  const triggerEl =
    trigger === 'pencil' ? (
      <Box
        component="span"
        onClick={handleOpen}
        role="button"
        aria-label="Edit question"
        sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}
      >
        <EditIcon fontSize="small" />
      </Box>
    ) : trigger === 'button' ? (
      <Button
        size="small"
        startIcon={<EditIcon />}
        onClick={handleOpen}
        variant="outlined"
        color="primary"
        sx={{ mb: 1 }}
      >
        Edit question
      </Button>
    ) : null

  return (
    <>
      {triggerEl}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isCreate ? 'Create question' : 'Edit question'}
          <Chip label={getInstructorProblemTypeLabel(proof.type)} size="small" variant="outlined" />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && (
              <Typography color="error">
                {error}
              </Typography>
            )}
            <AttemptLimitField
              value={editValue.attemptLimit ?? proof?.attemptLimit ?? 3}
              onChange={(v) => setEditValue((prev) => ({ ...prev, attemptLimit: v }))}
            />
            {proof.type === 'multiple-choice' && (
              <McEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'truth-table' && (
              <TruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'indirect-truth-table' && (
              <IndirectTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'nonclassical-truth-table' && (
              <NonClassicalTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {isDerivationProblemType(proof.type) && (
              <DerivationEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'evaluate-truth' && (
              <EvaluateTruthEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'symbolic-translation' && (
              <SymbolicTranslationEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'single-row-truth-table' && (
              <SingleRowTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'partial-truth-table' && (
              <PartialTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'combo-translation-truth-table' && (
              <ComboTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'combo-translation-derivation' && (
              <ComboPromptEditorForm proof={proof} value={editValue} onChange={setEditValue} label="Prompt" />
            )}
            {proof.type === 'proof-argument-extraction' && (
              <ProofArgumentExtractionEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {canDelete && (
            <Button color="error" onClick={handleDelete} disabled={saving} sx={{ mr: 'auto' }}>
              Delete
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isCreate ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const InstructorQuestionEditor = React.forwardRef(function InstructorQuestionEditor(
  { proof, isInstructorView, onSaved, onCreated, assignmentId, orderIndex, mode = 'edit', trigger = 'button', logicSystem },
  ref
) {
  return (
    <InstructorQuestionEditorInner
      proof={proof}
      isInstructorView={isInstructorView}
      onSaved={onSaved}
      onCreated={onCreated}
      assignmentId={assignmentId}
      orderIndex={orderIndex}
      mode={mode}
      trigger={trigger}
      logicSystem={logicSystem}
      forwardedRef={ref}
    />
  )
})

export default InstructorQuestionEditor
