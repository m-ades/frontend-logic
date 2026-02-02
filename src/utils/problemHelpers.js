// problem/grade display and submission response

const PARTIAL_CREDIT_TYPES = [
  'truth-table',
  'combo-translation-truth-table',
  'combo-translation-derivation',
]

// numeric score from validate response (top-level or submission)
export function getSubmissionScore(resp) {
  const raw = resp?.score ?? resp?.submission?.score
  return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null
}

// allow partial score in sidebar for this proof type
export function allowPartialForProof(proof, rawScore) {
  if (proof?.partialCredit) return true
  const hasScore = rawScore != null && Number.isFinite(Number(rawScore))
  return Boolean(
    hasScore &&
    rawScore > 0 &&
    rawScore < 100 &&
    proof?.type &&
    PARTIAL_CREDIT_TYPES.includes(proof.type)
  )
}

// score to show (0, 100, or raw) per proof
export function displayScoreForProof(proof, rawScore) {
  const hasScore = rawScore != null && Number.isFinite(Number(rawScore))
  if (!hasScore) return rawScore
  if (allowPartialForProof(proof, rawScore)) return Number(rawScore)
  return rawScore >= 100 ? 100 : 0
}
