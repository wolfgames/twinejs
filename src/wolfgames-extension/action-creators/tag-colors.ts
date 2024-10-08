import {Thunk} from 'react-hook-thunk-reducer';
import { StoriesState, Story, UpdateStoryAction } from '../../store/stories';
import { Color } from '../../util/color';
import { isValidTagName } from '../../util/tag';

export function setTagColors(
  story: Story,
  colorsMap: Record<string, Color>,
): Thunk<StoriesState, UpdateStoryAction> {
  for (const name of Object.keys(colorsMap)) {
    if (!isValidTagName(name)) {
      throw new Error(`"${name}" is not a valid tag name.`);
    }
  }

  return dispatch => {
    dispatch({
      type: 'updateStory',
      props: {tagColors: colorsMap},
      storyId: story.id
    });
  };
}
