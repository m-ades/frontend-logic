import * as React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import ProofTabs from './ProofTabs.jsx';

function WorksheetTabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`worksheet-tabpanel-${index}`}
      aria-labelledby={`worksheet-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ width: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function WorksheetTabs({
  worksheets,
  currentWorksheetIndex,
  onWorksheetIndexChange,
  currentProofIndex,
  onProofIndexChange,
  completedProofs,
  onProofComplete,
  getSavedProofState,
  handleProofStateChange
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleWorksheetChange = (e, newValue) => {
    onWorksheetIndexChange(newValue);
    onProofIndexChange(0);
  };

  return (
    <Box sx={{ width: '100%', mt: 0 }}>
      {worksheets.map((worksheet, idx) => (
        <WorksheetTabPanel key={worksheet.id} value={currentWorksheetIndex} index={idx}>
          <ProofTabs
            proofs={worksheet.proofs}
            currentProofIndex={currentProofIndex}
            onProofIndexChange={onProofIndexChange}
            completedProofs={completedProofs}
            onProofComplete={onProofComplete}
            getSavedProofState={getSavedProofState}
            handleProofStateChange={handleProofStateChange}
          />
        </WorksheetTabPanel>
      ))}
    </Box>
  );
}
