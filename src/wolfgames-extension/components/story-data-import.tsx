import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {CardContent} from '../../components/container/card';
import {
	DialogCard,
	DialogCardProps
} from '../../components/container/dialog-card';
import { StoryChooser } from '../../dialogs/story-import/story-chooser';
import { FileChooser } from '../../dialogs/story-import/file-chooser';
import { storyFileName } from '../../electron/shared';
import { Story, useStoriesContext } from '../../store/stories';
import { useStoriesRepair } from '../../store/use-stories-repair';
import { replaceStory } from '../action-creators/replace-story';
import './story-data-import.css';

export type StoryDataImportDialogProps = Omit<DialogCardProps, 'headerLabel'>;

export const StoryDataImportDialog: React.FC<StoryDataImportDialogProps> = props => {
	const {onClose} = props;
	const {t} = useTranslation();
	const repairStories = useStoriesRepair();
	const {dispatch, stories: existingStories} = useStoriesContext();
	const [file, setFile] = React.useState<File>();
	const [stories, setStories] = React.useState<Story[]>([]);

	function handleImport(stories: Story[]) {
    if (!stories.length) {
		  onClose();
      return;
    }

		dispatch(replaceStory(stories[0], existingStories));
		repairStories();
    onClose();
	}

	function handleFileChange(file: File, stories: Story[]) {
		// If there are no conflicts in the stories, import them now. Otherwise, set
		// them in state and let the user choose via <StoryChooser>.

		if (
			stories.length === 0 ||
			stories.some(story =>
				existingStories.some(
					existing => storyFileName(existing) === storyFileName(story)
				)
			)
		) {
			setFile(file);
			setStories(stories);
		} else {
			handleImport(stories);
		}
	}

	return (
		<DialogCard
			{...props}
			className="story-import-dialog"
			fixedSize
			headerLabel={t('dialogs.storyImport.title')}
		>
			<CardContent>
				<FileChooser onChange={handleFileChange} />
				{file && stories.length > 0 && (
					<StoryChooser
						existingStories={existingStories}
						onImport={handleImport}
						stories={stories}
					/>
				)}
				{file && stories.length === 0 && (
					<p>{t('dialogs.storyImport.noStoriesInFile')}</p>
				)}
			</CardContent>
		</DialogCard>
	);
};
