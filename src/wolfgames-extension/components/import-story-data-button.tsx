import {IconFileImport} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import { IconButton } from '../../components/control/icon-button';
import { useDialogsContext } from '../../dialogs';
import { StoryDataImportDialog } from './story-data-import';

export const ImportStoryDataButton: React.FC = () => {
	const {dispatch} = useDialogsContext();
	const {t} = useTranslation();

	return (
		<IconButton
			icon={<IconFileImport />}
			label={t('common.import')}
			onClick={() =>
				dispatch({type: 'addDialog', component: StoryDataImportDialog})
			}
		/>
	);
};
