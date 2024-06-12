import * as React from 'react';
import { StoryFormatToolbarProps } from "../dialogs/passage-edit/story-format-toolbar";
import { IconButton } from '../components/control/icon-button';
import { magicIcon } from './icons/magic';
import { writingIcon } from './icons/writing';
import { addIcon } from './icons/add';
import { textCloudIcon } from './icons/text-cloud';

export const withWolfgames = (StoryFormatToolbar: React.FC<StoryFormatToolbarProps>) => {
  const WithWolfgames: React.FC<StoryFormatToolbarProps> = (props) => {
    // useEffect(() => {
    //   props.editor?.on('cursorActivity', () => {
    //     console.log('editor', props.editor?.getCursor());
    //     console.log('editor', props.editor?.getLine(2));
    //   })
    // }, [props.editor]);

    return <>
      <div className="wolfgames-toolbar">
        <IconButton
          key="wolfgames-generate-button"
          disabled={props.disabled}
          icon={magicIcon}
          iconOnly={false}
          label="Generate"
          onClick={() => {
            console.log('CLICKED');
          }}
        />
        <IconButton
          key="wolfgames-writing-button"
          disabled={props.disabled}
          icon={writingIcon}
          iconOnly={false}
          label="Writing"
          onClick={() => {
            console.log('CLICKED');
          }}
        />
        <IconButton
          key="wolfgames-link-evidence-button"
          disabled={props.disabled}
          icon={addIcon}
          iconOnly={false}
          label="Add evidence link"
          onClick={() => {
            console.log('CLICKED');
          }}
        />
        <IconButton
          key="wolfgames-bot-button"
          disabled={props.disabled}
          icon={textCloudIcon}
          iconOnly={false}
          label="ADA"
          onClick={() => {
            console.log('CLICKED');
          }}
        />
      </div>
      <StoryFormatToolbar {...props} />
    </>;
  };

  WithWolfgames.displayName = `withWolfgames(${StoryFormatToolbar.displayName || StoryFormatToolbar.name})`;

  return WithWolfgames;
};
