import {CreatePassageAction, Story} from '../store/stories';

export function createCustomPassage(
	story: Story,
	centerX: number,
	centerY: number,
	name: string,
	text: string,
  tags: Array<string>,
): CreatePassageAction {
	if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
		throw new Error('Center must be a finite coordinate pair');
	}

	if (story.passages.some(passage => passage.name === name)) {
		throw new Error('Passage with such name already exists');
	}

	const passageGap = 25;
	const bounds = {
		left: Math.max(centerX - 100 / 2, 0),
		top: Math.max(centerY - 100 / 2, 0),
		height: 100,
		width: 100
	};

	if (story.snapToGrid) {
		bounds.left = Math.round(bounds.left / passageGap) * passageGap;
		bounds.top = Math.round(bounds.top / passageGap) * passageGap;
	}

	return {
		type: 'createPassage',
		storyId: story.id,
		props: {
			...bounds,
			story: story.id,
			name,
      text,
      tags,
		}
	};
}
