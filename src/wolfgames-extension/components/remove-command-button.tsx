import * as React from 'react';
import { IconX } from '@tabler/icons';

import './remove-command-button.css';

type Props = {
  onClick: () => void;
};

export const RemoveCommandButton: React.FC<Props> = ({ onClick }) => {
  return (
    <div className="remove-command-button-wrapper" onClick={onClick}>
      <IconX />
    </div>
  );
};
