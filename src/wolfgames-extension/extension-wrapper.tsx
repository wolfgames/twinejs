import uuid from 'tiny-uuid';
import * as React from 'react';
import {createContext, useEffect, useRef, useState} from 'react';
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
  updatePassage, updateStory,
  useStoriesContext,
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
import { createCustomPassage } from './create-custom-passage.action';
import { footerData } from './footer-data';
import { imagesData, mappersData } from './internal-nodes-data';
import {
  TwinejsGetStructureResponseEvent
} from '../../../shared/messaging/events/twinejs-get-structure-response.event';
import { TwinejsCreatePassageEvent } from '../../../shared/messaging/events/twinejs-create-passage.event';
import { rectsIntersect } from '../util/geometry';

const startupDataNodeName = 'Startup';
const footerDataNodeName = 'Footer';
export const imagesDataNodeName = 'Images';
export const mappersDataNodeName = 'Mappers';

let isInitiated= false;
const setIsInitiated = (v: boolean) => isInitiated = v;

export const MessagingServiceContext = createContext<MessagingService<
  MessagingSlice.Twine,
  MessagingSlice.App
> | null>(null);

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

			const passageId = uuid();

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
						id: uuid(),
						story: '',
						left: 0,
						top: 0,
            height: 100,
            width: 100,
            tags: ['startup'],
						name: startupDataNodeName,
						text: startupDataMapper(message.data.evidence)
					},
					{
						...passageDefaults(),
						id: uuid(),
						story: '',
						left: 0,
						top: 100,
            height: 100,
            width: 100,
            tags: ['footer'],
						name: footerDataNodeName,
						text: footerData(),
					},
					{
						...passageDefaults(),
						id: uuid(),
						story: '',
						left: 0,
						top: 200,
            height: 100,
            width: 100,
            tags: ['startup'],
						name: imagesDataNodeName,
						text: imagesData(),
					},
					{
						...passageDefaults(),
						id: uuid(),
						story: '',
						left: 0,
						top: 300,
            height: 100,
            width: 100,
            tags: ['startup'],
						name: mappersDataNodeName,
						text: mappersData(),
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

		const getStructureHandler = () => {
			const story = storiesRef.current[0];

			if (!story) return;

			messagingService.send(
				new TwinejsGetStructureResponseEvent({
					passages: story.passages.map(p => ({
            uid: p.id,
            name: p.name,
            content: p.text,
          })),
          startPassage: story.startPassage,
				})
			);
		};

		messagingService.sub(MessagingEventType.TwinejsGetStructure, getStructureHandler);

		return () => {
			messagingService.unsub(MessagingEventType.TwinejsGetStructure, getStructureHandler);
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
			const imagesPassage = story.passages.find(p => p.name === imagesDataNodeName);
			const mappersPassage = story.passages.find(p => p.name === mappersDataNodeName);

			if (!footerPassage) {
				dispatch(
          createCustomPassage(
						story,
						0,
						150,
						footerDataNodeName,
            footerData(),
            ['footer'],
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

      if (!imagesPassage) {
        dispatch(
          createCustomPassage(
            story,
            0,
            250,
            imagesDataNodeName,
            imagesData(),
            ['startup'],
          )
        );
      }

      if (!mappersPassage) {
        dispatch(
          createCustomPassage(
            story,
            0,
            350,
            mappersDataNodeName,
            mappersData(),
            ['startup'],
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

    /**
     * Original code: [createUntitledPassage](create-untitled-passage.ts#createUntitledPassage)
     */
		const createHandler = (message: TwinejsCreatePassageEvent) => {
			const story = storiesRef.current[0];

			if (!story) {
				return;
			}

      const defs = passageDefaults();
      const parentPassage = story.passages.find(p => p.name === message.data.parentPassageName);

      const left = parentPassage?.left || defs.left;
      const top = parentPassage?.top || defs.top;

      const passageGap = 25;
      const bounds = {
        height: defs.height,
        left: Math.max(left + defs.width / 2, 0),
        top: Math.max(top + defs.height / 2, 0),
        width: defs.width
      };

      if (story.snapToGrid) {
        bounds.left = Math.round(bounds.left / passageGap) * passageGap;
        bounds.top = Math.round(bounds.top / passageGap) * passageGap;
      }

      const needsMoving = () =>
        story.passages.some(passage => rectsIntersect(passage, bounds));

      while (needsMoving()) {
        // Try rightward.

        bounds.left += bounds.width + passageGap;

        if (!needsMoving()) {
          break;
        }

        // Try downward.

        bounds.left -= bounds.width + passageGap;
        bounds.top += bounds.height + passageGap;

        if (!needsMoving()) {
          break;
        }

        // Try leftward.

        if (bounds.left >= bounds.width + passageGap) {
          bounds.left -= bounds.width + passageGap;

          if (!needsMoving()) {
            break;
          }

          bounds.left += bounds.width + passageGap;
        }

        // Move downward permanently and repeat.

        bounds.top += bounds.height + passageGap;
      }

      dispatch(
        createCustomPassage(
          story,
          bounds.left,
          bounds.top,
          message.data.name,
          '',
          [],
          true,
        )
      );
		};

		messagingService.sub(MessagingEventType.TwinejsCreatePassage, createHandler);

		return () => {
			messagingService.unsub(MessagingEventType.TwinejsCreatePassage, createHandler);
		};
	}, [messagingService, dispatch]);

	useEffect(() => {
		if (!messagingService || !messagingService.isSetUp) {
			return;
		}

		const addItemsHandler = (message: TwinejsAddStoryItemsEvent) => {
			const story = storiesRef.current[0];

			if (!story) {
				return;
			}

      dispatch(updateStory(storiesRef.current, story, {
        passages: story.passages.map(p => {
          if (p.name === mappersDataNodeName && message.data.mappersPassageContent !== undefined) {
            return {
              ...p,
              text: message.data.mappersPassageContent,
            };
          }

          return p;
        }),
      }));

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

      const basePassageX = maxPassageX + 200;

      passagesToAdd.forEach(passage => {
        const { x, y } = message.data.nodePositions[passage.uid] || { x: 0, y: 0 };

        dispatch(
          createCustomPassage(
            story,
            basePassageX + x * 4,
            y * 4,
            passage.name,
            passage.content,
            []
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

	return (
    <MessagingServiceContext.Provider value={messagingService}>
      {children}
    </MessagingServiceContext.Provider>
  );
};
