import * as React from 'react';
import { MarqueeablePassageMapProps } from '../routes/story-edit/marqueeable-passage-map';

export const withWolfgames = (StoryFormatToolbar: React.FC<MarqueeablePassageMapProps>) => {
  const WithWolfgames: React.FC<MarqueeablePassageMapProps> = (props) => {
    return <StoryFormatToolbar
      {...props}
      onSelect={(p, e) => {
        props.onSelect(p, e);
        props.onEdit(p);
      }}
    />;
  };

  WithWolfgames.displayName = `withWolfgames(${StoryFormatToolbar.displayName || StoryFormatToolbar.name})`;

  return WithWolfgames;
};
