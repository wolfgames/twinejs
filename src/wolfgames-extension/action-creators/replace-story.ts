import {Thunk} from 'react-hook-thunk-reducer';
import { CreateStoryAction, StoriesState, Story, UpdateStoryAction } from '../../store/stories';

/**
 * Replace current story with provided one.
 */
export function replaceStory(
	toReplace: Story,
	existingStories: Story[]
): Thunk<StoriesState, CreateStoryAction | UpdateStoryAction> {
	return dispatch => {
    // Remove the temp ID that was assigned to the new story.

    const props: Partial<Story> = {...toReplace};

    delete props.id;

    const existingStory = existingStories.at(0);

    // Do an update so that if something goes awry, we won't have deleted the
    // story. We need to update passage props so that their parent story ID is
    // set properly.

    if (existingStory) {
      if (props.passages) {
        props.passages = props.passages.map(passage => ({
          ...passage,
          story: existingStory.id
        }));
      }

      dispatch({props, type: 'updateStory', storyId: existingStory.id});
    } else {
      dispatch({props, type: 'createStory'});
    }
	};
}
