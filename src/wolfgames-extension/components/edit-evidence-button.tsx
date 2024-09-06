import * as React from 'react';

import './edit-evidence-button.css';

type Props = {
  onClick: () => void;
};

export const EditEvidenceButton: React.FC<Props> = ({ onClick }) => {
  return (
    <div className="edit-evidence-button-wrapper" onClick={onClick}>
      <div className="edit-evidence-button" />
    </div>
  );
};
