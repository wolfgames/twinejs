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
import {startupDataMapper} from './startup-data-mapper';
import {createStartupPassage} from './create-startup-passage.action';
import {TwinejsUpdatePrefsEvent} from '../../../shared/messaging/events/twinejs-update-prefs.event';
import { TwinejsAddStoryItemsEvent } from '../../../shared/messaging/events/twinejs-add-story-items.event';
import { createFooterPassage } from './create-footer-passage.action';
import { footerData } from './footer-data';

const startupDataNodeName = 'Startup';
const footerDataNodeName = 'Footer';

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
            text: ''
					},
					{
						...passageDefaults(),
						id: Math.random().toString(),
						story: '',
						left: 0,
						top: 0,
            tags: ['startup'],
						name: startupDataNodeName,
						text: startupDataMapper(message.data.evidence)
					},
					{
						...passageDefaults(),
						id: Math.random().toString(),
						story: '',
						left: 0,
						top: 150,
            tags: ['footer'],
						name: footerDataNodeName,
						text: footerData(),
					},
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

			const startupPassage = story.passages.find(p => p.name === startupDataNodeName);

			if (!startupPassage) {
				dispatch(
					createStartupPassage(
						story,
						0,
						0,
						startupDataNodeName,
						startupDataMapper(message.data.evidence)
					)
				);
			} else {
				dispatch(
					updatePassage(
						story,
						startupPassage,
						{text: startupDataMapper(message.data.evidence)},
						{dontUpdateOthers: true}
					)
				);
			}

			const footerPassage = story.passages.find(p => p.name === footerDataNodeName);

			if (!footerPassage) {
				dispatch(
          createFooterPassage(
						story,
						0,
						150,
						footerDataNodeName,
            footerData()
					)
				);
			} else {
				dispatch(
					updatePassage(
						story,
            footerPassage,
						{text: footerData()},
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

		const addItemsHandler = (message: TwinejsAddStoryItemsEvent) => {
			const story = storiesRef.current[0];

			if (!story) {
				return;
			}

      let maxPassageX = 0;
      const currentPassageNamesSet = new Set(story.passages.map(p => {
        if (p.left > maxPassageX) {
          maxPassageX = p.left;
        }

        return p.name;
      }));

      const getUniqueVersion = (name: string, id = 0): string => {
        if (currentPassageNamesSet.has(name)) {
          return getUniqueVersion(`${name}${id}`, id + 1);
        }

        return name;
      };

      const passagesToAdd = message.data.items.map(
        item => ({ ...item, name: getUniqueVersion(item.name) })
      );
      const passagesToAddGrouped = passagesToAdd.reduce<Record<string, TwinejsAddStoryItemsEvent['data']['items'][0]>>((acc, passage) => {
        acc[passage.uid] = passage;

        return acc;
      }, {});

      const passagesPathsMap = message.data.relations.reduce<Record<string, Array<string>>>((acc, relation) => {
        if (acc[relation.sourceUid]) {
          acc[relation.sourceUid].push(passagesToAddGrouped[relation.targetUid].name);
        } else {
          acc[relation.sourceUid] = [passagesToAddGrouped[relation.targetUid].name];
        }

        return acc;
      }, {});

      const basePassageX = maxPassageX + 200;

      passagesToAdd.forEach(passage => {
        const { x, y } = message.data.nodePositions[passage.uid] || { x: 0, y: 0 };

        dispatch(
          createStartupPassage(
            story,
            basePassageX + x * 4,
            y * 4,
            passage.name,
            `${passage.description}\n\n${passagesPathsMap[passage.uid]?.map(target => `[[${target}]]`).join('\n')}`
          )
        );
      });
		};

		messagingService.sub(MessagingEventType.AddStoryItems, addItemsHandler);

		return () => {
			messagingService.unsub(MessagingEventType.AddStoryItems, addItemsHandler);
		};
	}, [messagingService, dispatch]);

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
