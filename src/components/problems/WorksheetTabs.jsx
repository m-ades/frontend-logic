import * as React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import ProofTabs from './ProofTabs.jsx';
import { updateRulebookForProblem, useLayoutDispatch } from '../../context/LayoutContext.jsx';

export default function WorksheetTabs({
  worksheet,
  currentProofIndex,
  onProofIndexChange,
  completedProofs,
  questionScores = {},
  onProofComplete,
  getSavedProofState,
  handleProofStateChange,
  total,
  completionPercent,
  gradeLabel,
  policySummary = [],
  isOverdue,
  isInstructorView = false,
  canGrantAttempts = isInstructorView,
  canSubmitWhileLocked = false,
  onQuestionSaved,
  onQuestionCreated,
  logicSystem,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const layoutDispatch = useLayoutDispatch();
  const activeProblemType = worksheet.proofs[currentProofIndex]?.type ?? null;

  React.useEffect(() => {
    updateRulebookForProblem(layoutDispatch, activeProblemType);
  }, [activeProblemType, layoutDispatch]);

  React.useEffect(() => () => {
    updateRulebookForProblem(layoutDispatch, null);
  }, [layoutDispatch]);

  return (
    <Box sx={{ width: '100%', mt: 0 }}>
      <ProofTabs
        key={worksheet.id}
        proofs={worksheet.proofs}
        currentProofIndex={currentProofIndex}
        onProofIndexChange={onProofIndexChange}
        completedProofs={completedProofs}
        questionScores={questionScores}
        onProofComplete={onProofComplete}
        getSavedProofState={getSavedProofState}
        handleProofStateChange={handleProofStateChange}
        total={total}
        completionPercent={completionPercent}
        gradeLabel={gradeLabel}
        policySummary={policySummary}
        isOverdue={isOverdue}
        isAssignmentLocked={!canSubmitWhileLocked && (worksheet.isLocked ?? false)}
        isInstructorView={isInstructorView}
        canGrantAttempts={canGrantAttempts}
        onQuestionSaved={onQuestionSaved}
        onQuestionCreated={onQuestionCreated}
        assignmentId={worksheet.id}
        logicSystem={logicSystem}
        groupQuestionsByType={worksheet.groupQuestionsByType ?? false}
      />
    </Box>
  );
}
