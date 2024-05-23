import React from 'react';
import { ImportStoryDataButton } from './components/import-story-data-button';

export const buildActionsWrapper = <T extends {}>(component: React.FC<T>): React.FC<T> => {
  // @ts-ignore
  return (args: T) => {
    const res = component(args);

    return {
      ...res,
      props: {
        ...res?.props,
        children: [
          ...res?.props?.children,
          <ImportStoryDataButton />
        ]
      }
    };
  };
};
