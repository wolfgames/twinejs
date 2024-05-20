import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {MessagingService} from '../../../shared/messaging/messaging.service';
import {TwinejsMountDoneEvent} from '../../../shared/messaging/events/twinejs-mount-done.event';
import {
	MessagingEventType,
	MessagingSlice
} from '../../../shared/messaging/messaging.types';
import {TwinejsInitiateEvent} from '../../../shared/messaging/events/twinejs-initiate.event';
import {TwinejsInitiationDoneEvent} from '../../../shared/messaging/events/twinejs-initiation-done.event';
import {
	createStory,
	deleteStory,
	importStories,
	passageDefaults,
	updatePassage,
	useStoriesContext
} from '../store/stories';
import { useHistory, useLocation } from 'react-router-dom';
import {setPref, usePrefsContext} from '../store/prefs';

import './extension-styles.css';
import {storyFromTwee, storyToTwee} from '../util/twee';
import {TwinejsExportResponseEvent} from '../../../shared/messaging/events/twinejs-export-response.event';
import {TwinejsUpdateDataEvent} from '../../../shared/messaging/events/twinejs-update-data.event';
import {evidenceDataMapper} from './evidence-data-mapper';
import {createEvidencePassage} from './create-evidence-passage.action';
import {TwinejsUpdatePrefsEvent} from '../../../shared/messaging/events/twinejs-update-prefs.event';

const evidenceDataNodeName = 'Evidence data';

let isInitiated= false;
const setIsInitiated = (v: boolean) => isInitiated = v;

export const ExtensionWrapper: React.FC = ({children}) => {
	const history = useHistory();
	const {pathname} = useLocation();
	const {dispatch: prefsDispatch, prefs} = usePrefsContext();
	const {dispatch, stories} = useStoriesContext();
	const storiesRef = useRef(stories);

	storiesRef.current = stories;

  useEffect(() => {
    prefsDispatch(setPref('welcomeSeen', true));
  }, [prefsDispatch]);

  useEffect(() => {
    if (isInitiated && stories.length) {
      history.replace(`/stories/${stories[0].id}`);
    }
  }, [stories, history, pathname]);

	const [messagingService, setMessagingService] = useState<MessagingService<
		MessagingSlice.Twine,
		MessagingSlice.App
	> | null>(null);

	useEffect(() => {
    if (!messagingService) {
			const newMessagingService = new MessagingService();

			const {cleanup, initiationDonePromise} =
				newMessagingService.initiateNested(window.parent);

			initiationDonePromise.then(() => {
				setMessagingService(newMessagingService);
			});

			return cleanup;
		}
    // @ts-ignore
    // eslint-disable-next-line
  }, []);

	useEffect(() => {
		if (!messagingService || !messagingService.isSetUp) {
			return;
		}

    const initiationHandler = (message: TwinejsInitiateEvent) => {
      setIsInitiated(false);
      history.replace('/');
      storiesRef.current.forEach(s => dispatch(deleteStory(s)));
      storiesRef.current = [];
      prefsDispatch(setPref('appTheme', message.data.theme));

			if ('source' in message.data) {
				const newStory = storyFromTwee(message.data.source);

				setIsInitiated(true);

				dispatch(importStories([newStory], []));

				messagingService.send(new TwinejsInitiationDoneEvent(null));

				return;
			}

			const passageId = Math.random().toString();

      setIsInitiated(true);

      createStory([], prefs, {
				name: Math.random().toString(),
				startPassage: passageId,
				passages: [
					{
						...passageDefaults(),
						story: '',
						left: 200,
						top: 200,
						id: passageId,
            text: '(set: $entry to (passage:)\'s name)\n(if:visits is 1)[(redirect: "Evidence data")]'
					},
					{
						...passageDefaults(),
						id: Math.random().toString(),
						story: '',
						name: evidenceDataNodeName,
						text: evidenceDataMapper(message.data.evidence)
					}
				]
			})(dispatch, () => []);

			messagingService.send(new TwinejsInitiationDoneEvent(null));
		};

		messagingService.sub(MessagingEventType.TwinejsInitiate, initiationHandler);
		messagingService.send(new TwinejsMountDoneEvent(null));

		return () => {
			messagingService.unsub(
				MessagingEventType.TwinejsInitiate,
				initiationHandler
			);
		};
    // @ts-ignore
    // eslint-disable-next-line
	}, [messagingService?.isSetUp]);

	useEffect(() => {
		if (!messagingService || !messagingService.isSetUp) {
			return;
		}

		const exportHandler = () => {
			const story = storiesRef.current[0];

			if (!story) return;

			const source = storyToTwee(story);

			messagingService.send(
				new TwinejsExportResponseEvent({
					source
				})
			);
		};

		messagingService.sub(MessagingEventType.TwinejsExport, exportHandler);

		return () => {
			messagingService.unsub(MessagingEventType.TwinejsExport, exportHandler);
		};
	}, [messagingService]);

	useEffect(() => {
		if (!messagingService || !messagingService.isSetUp) {
			return;
		}

		const updateHandler = (message: TwinejsUpdateDataEvent) => {
			const story = storiesRef.current[0];

			if (!story) {
				return;
			}

			const passage = story.passages.find(p => p.name === evidenceDataNodeName);

			if (!passage) {
				dispatch(
					createEvidencePassage(
						story,
						0,
						0,
						evidenceDataNodeName,
						evidenceDataMapper(message.data.evidence)
					)
				);
			} else {
				dispatch(
					updatePassage(
						story,
						passage,
						{text: evidenceDataMapper(message.data.evidence)},
						{dontUpdateOthers: true}
					)
				);
			}
		};

		messagingService.sub(MessagingEventType.TwinejsUpdateData, updateHandler);

		return () => {
			messagingService.unsub(MessagingEventType.TwinejsUpdateData, updateHandler);
		};
  // eslint-disable-next-line
	}, [messagingService]);

	useEffect(() => {
		if (!messagingService || !messagingService.isSetUp) {
			return;
		}

		const updateHandler = (message: TwinejsUpdatePrefsEvent) => {
			prefsDispatch(setPref('appTheme', message.data.theme));
		};

		messagingService.sub(MessagingEventType.TwinejsUpdatePrefs, updateHandler);

		return () => {
			messagingService.unsub(
				MessagingEventType.TwinejsUpdatePrefs,
				updateHandler
			);
		};
  // eslint-disable-next-line
	}, [messagingService]);

	return <>{children}</>;
};
