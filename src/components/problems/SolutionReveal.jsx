import { Box, Typography, RadioGroup, FormControlLabel, Radio } from '@mui/material'

function renderLines(lines) {
  return (
    <Box
      component="ol"
      sx={{
        pl: 3,
        my: 0,
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '0.95rem',
        lineHeight: 1.6
      }}
    >
      {lines.map((line, idx) => {
        const lineNo = line?.n ?? line?.line ?? idx + 1
        const statement = line?.s ?? line?.formula ?? line?.statement ?? ''
        const justification = line?.j ?? line?.justification ?? line?.rule ?? ''
        return (
          <li key={`${lineNo}-${idx}`}>
            <Box component="span" sx={{ mr: 1 }}>{statement}</Box>
            {justification && (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                [{justification}]
              </Box>
            )}
          </li>
        )
      })}
    </Box>
  )
}

function renderChoiceAnswer(answer, choices) {
  const selected = typeof answer === 'number' ? String(answer) : ''
  return (
    <RadioGroup value={selected}>
      {choices.map((choice, index) => (
        <FormControlLabel
          key={`${choice}-${index}`}
          value={String(index)}
          control={<Radio disabled />}
          label={choice}
        />
      ))}
    </RadioGroup>
  )
}

function renderBooleanAnswer(answer) {
  const selected = answer === true ? 'true' : answer === false ? 'false' : ''
  return (
    <RadioGroup value={selected} row>
      <FormControlLabel value="true" control={<Radio disabled />} label="True" />
      <FormControlLabel value="false" control={<Radio disabled />} label="False" />
    </RadioGroup>
  )
}

function renderSolution({ type, solution, answer, question }) {
  if (solution?.lines && Array.isArray(solution.lines)) {
    return renderLines(solution.lines)
  }

  if (type === 'multiple-choice' && question?.choices) {
    return renderChoiceAnswer(answer, question.choices)
  }

  if (type === 'true-false' || type === 'evaluate-truth') {
    return renderBooleanAnswer(answer)
  }

  if (type === 'symbolic-translation') {
    return (
      <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'pre-wrap' }}>
        {String(answer ?? '')}
      </Typography>
    )
  }

  if (type === 'valid-correct-sound') {
    return (
      <Box sx={{ display: 'grid', gap: 1 }}>
        {['correct', 'valid', 'sound'].map((key) => (
          <Box key={key}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {key === 'correct' ? 'Factually correct?' : key === 'valid' ? 'Valid?' : 'Sound?'}
            </Typography>
            {renderBooleanAnswer(answer?.[key])}
          </Box>
        ))}
      </Box>
    )
  }

  if (typeof solution === 'string' || typeof solution === 'number' || typeof solution === 'boolean') {
    return (
      <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'pre-wrap' }}>
        {String(solution)}
      </Typography>
    )
  }

  if (solution !== null && solution !== undefined) {
    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '0.9rem',
          whiteSpace: 'pre-wrap'
        }}
      >
        {JSON.stringify(solution, null, 2)}
      </Box>
    )
  }

  return null
}

export default function SolutionReveal({ show = false, type, solution, answer, question }) {
  if (!show) return null

  const content = renderSolution({ type, solution, answer, question })
  if (!content) return null

  return (
    <Box
      sx={{
        mt: 3,
        p: 2,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        backgroundColor: 'rgba(47, 107, 255, 0.05)'
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Correct Answer
      </Typography>
      {content}
    </Box>
  )
}
