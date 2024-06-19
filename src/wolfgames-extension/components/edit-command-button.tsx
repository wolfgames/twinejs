import * as React from 'react';
import {IconEdit} from '@tabler/icons';

import './edit-command-button.css';

type Props = {
  onClick: () => void;
};

export const EditCommandButton: React.FC<Props> = ({ onClick }) => {
  return (
    <div className="edit-command-button-wrapper" onClick={onClick}>
      <IconEdit />
    </div>
  );
};
