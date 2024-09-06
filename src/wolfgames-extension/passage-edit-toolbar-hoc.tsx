import * as React from 'react';
import * as ReactDOM from 'react-dom';
import throttle from 'lodash/throttle';
import {
  IconCirclePlus,
  IconWand,
  IconMessageCircle,
} from '@tabler/icons';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Editor } from 'codemirror';
import { StoryFormatToolbarProps } from '../dialogs/passage-edit/story-format-toolbar';
import { IconButton } from '../components/control/icon-button';
import { TwineCustomCommand } from './startup-data-mapper';
import { omit } from 'lodash';
import { imagesDataNodeName, mappersDataNodeName, MessagingServiceContext } from './extension-wrapper';
import { TwinejsCommandEditEvent } from '../../../shared/messaging/events/twinejs-command-edit.event';
import { MessagingEventType } from '../../../shared/messaging/messaging.types';
import { EditCommandButton } from './components/edit-command-button';
import {
  TwinejsCommandEditResponseEvent
} from '../../../shared/messaging/events/twinejs-command-edit-response.event';
import { updateStory, useStoriesContext } from '../store/stories';
import { LabeledMenuItem, MenuButton, MenuSeparator } from '../components/control/menu-button';
import { useDialogsContext } from '../dialogs';
import { RemoveCommandButton } from './components/remove-command-button';
import './passage-edit-toolbar-hoc.css';
import { TwinejsGeneratePassageEvent } from '../../../shared/messaging/events/twinejs-generate-passage.event';
import {
  TwinejsGeneratePassageResponseEvent
} from '../../../shared/messaging/events/twinejs-generate-passage-response.event';
import { EditEvidenceButton } from './components/edit-evidence-button';
import { TwinejsEditEvidenceEvent } from '../../../shared/messaging/events/twinejs-edit-evidence.event';

const findWrappingBracketsNested = (s: string, startPosition: number, endPosition: number, currentQuotesState = false) => {
  let leftCursor = startPosition;
  let rightCursor = endPosition;

  let leftClosedCount = 0;
  let rightOpenedCount = 0;

  let isLeftInDoubleQuotes = currentQuotesState;
  let isRightInDoubleQuotes = currentQuotesState;

  do {
    if (rightCursor >= s.length || leftCursor < 0) {
      return null;
    }

    if (s[leftCursor] === '"' && s[leftCursor - 1] !== '\\') {
      isLeftInDoubleQuotes = !isLeftInDoubleQuotes;
    }
    if (s[rightCursor] === '"' && s[rightCursor - 1] !== '\\') {
      isRightInDoubleQuotes = !isRightInDoubleQuotes;
    }

    if (s[rightCursor] === '(' && rightCursor !== endPosition && !isRightInDoubleQuotes && s[rightCursor - 1] !== '\\') {
      rightOpenedCount++;
    }
    if (s[leftCursor] === ')' && leftCursor !== startPosition && !isLeftInDoubleQuotes && s[leftCursor - 1] !== '\\') {
      leftClosedCount++;
    }
    if (s[rightCursor] !== ')' || isRightInDoubleQuotes || s[rightCursor - 1] === '\\') {
      rightCursor++;
    } else if (rightOpenedCount > 0) {
      rightOpenedCount--;
      rightCursor++;
    }
    if (s[leftCursor] !== '(' || isLeftInDoubleQuotes || s[leftCursor - 1] === '\\') {
      leftCursor--;
    } else if (leftClosedCount > 0) {
      leftClosedCount--;
      leftCursor--;
    }
  } while (s[rightCursor] !== ')' || isRightInDoubleQuotes || isLeftInDoubleQuotes || s[leftCursor] !== '(' || rightOpenedCount > 0 || leftClosedCount > 0);

  return {
    start: leftCursor,
    end: rightCursor,
  };
};

const findWrappingBrackets = (s: string, startPosition: number, endPosition: number) => {
  return findWrappingBracketsNested(s, startPosition, endPosition, false)
    || findWrappingBracketsNested(s, startPosition, endPosition, true);
};

const manageableCommand = [
  TwineCustomCommand.Bot,
  TwineCustomCommand.Action,
  TwineCustomCommand.Trigger,
  TwineCustomCommand.ChatTrigger,
  TwineCustomCommand.ChatTriggerOff,
] as const;

const extractManageableCommands = (value: string, index: number) => {
  const res: Array<{
    type: TwineCustomCommand,
    value: string,
    startPosition: number,
    endPosition: number,
  }> = [];

  let currentCommand = null;
  let currentStartIndex = index;
  let currentEndIndex = index;

  do {
    currentCommand = findWrappingBrackets(value, currentStartIndex, currentEndIndex);

    if (currentCommand) {
      const commandCandidate = value.slice(currentCommand.start, currentCommand.end + 1);

      const command = manageableCommand.find(mcp => commandCandidate.startsWith(`(${mcp}:`));

      currentStartIndex = currentCommand.start - 1;
      currentEndIndex = currentCommand.end + 1;

      if (command) {
        res.push({
          type: command,
          value: commandCandidate,
          startPosition: currentStartIndex + 1,
          endPosition: currentEndIndex,
        });
      }
    }
  } while (currentCommand !== null)

  return res;
};

const extractEvidence = (value: string) => {
  const res: Array<{
    evidenceName: string,
    value: string,
    startPosition: number,
    endPosition: number,
  }> = [];

  const evidenceMarker = `(${TwineCustomCommand.Evidence}:`;
  const evidenceMarkerLength = evidenceMarker.length;

  let currentPosition = -1;

  do {
    currentPosition = value.indexOf(evidenceMarker, currentPosition + 1);

    if (currentPosition > -1) {
      const currentEvidence = findWrappingBrackets(value, currentPosition + 1, currentPosition + 1);

      if (currentEvidence) {
        const evidenceCandidate = value.slice(currentEvidence.start, currentEvidence.end + 1);

        const currentStartIndex = currentEvidence.start - 1;
        const currentEndIndex = currentEvidence.end + 1;

        if (evidenceCandidate.startsWith(evidenceMarker)) {
          res.push({
            evidenceName: evidenceCandidate.replace('\n', '').slice(evidenceMarkerLength + 2, -2).trim(),
            value: evidenceCandidate,
            startPosition: currentStartIndex + 1,
            endPosition: currentEndIndex,
          });
        }
      }
    }
  } while (currentPosition !== -1)

  return res;
};

export const withWolfgames = (StoryFormatToolbar: React.FC<StoryFormatToolbarProps>) => {
  const WithWolfgames: React.FC<StoryFormatToolbarProps> = (props) => {
    const { dialogs } = useDialogsContext();
    const messagingService = useContext(MessagingServiceContext);
    const {dispatch, stories} = useStoriesContext();
    const [selectedCommandsMap, setSelectedCommandsMap] = useState<
      Map<
        typeof manageableCommand[number],
        {
          value: string,
          startPosition: number,
          endPosition: number,
        }
      >
    >(new Map());

    const onCursorActivity = useCallback((editor: Editor) => {
      const cursor = editor.getCursor();
      const currentIndex = editor.indexFromPos(cursor);
      const value = editor.getValue();

      // TODO: improvements to implement:
      // TODO: add memo for non Wolfgames stuff (to not re-render entire editor because of custom toolbar)
      // TODO: add parser for system passages which checks for dm item that aren't used and colors them red
      // TODO: "format" button that runs all dm cleaners + orders passages

      const manageableCommands = extractManageableCommands(value, currentIndex);

      if (manageableCommands.length) {
        setSelectedCommandsMap(manageableCommands.reduce((acc, mc) => {
          acc.set(mc.type, omit(mc, 'type'));

          return acc;
        }, new Map()))
      } else {
        setSelectedCommandsMap(new Map());
      }
    }, []);

    useEffect(() => {
      const cursorActivityHandler = () => {
        if (props.editor) {
          onCursorActivity(props.editor);
        }
      };

      props.editor?.on('cursorActivity', cursorActivityHandler)

      return () => {
        props.editor?.off('cursorActivity', cursorActivityHandler)
      };
    }, [props.editor, onCursorActivity]);

    const updateSystemPassages = useCallback((
      imagesPassageContent?: string,
      mappersPassageContent?: string,
    ) => {
      const story = stories.at(0);

      if (!story) {
        return;
      }

      const uidAliasDataNode = story.passages.find(p => p.name === mappersDataNodeName);
      const imagesDataNode = story.passages.find(p => p.name === imagesDataNodeName);

      if (!imagesDataNode || !uidAliasDataNode) {
        return;
      }

      dispatch(updateStory(stories, story, {
        passages: story.passages.map(p => {
          if (p.name === mappersDataNodeName && mappersPassageContent !== undefined) {
            return {
              ...p,
              text: mappersPassageContent,
            };
          }
          if (p.name === imagesDataNodeName && imagesPassageContent !== undefined) {
            return {
              ...p,
              text: imagesPassageContent,
            };
          }

          return p;
        }),
      }));
    }, [stories, dispatch]);

    useEffect(() => {
      const commandEditResponseHandler = (message: TwinejsCommandEditResponseEvent) => {
        if (!props.editor) {
          return;
        }

        props.editor.replaceRange(
          message.data.value,
          props.editor.posFromIndex(message.data.startPosition),
          props.editor.posFromIndex(message.data.endPosition),
        );
        updateSystemPassages(
          message.data.imagesPassageContent,
          message.data.mappersPassageContent,
        )
      };

      if (!props.editor || !messagingService || props.disabled) {
        return () => {
          messagingService?.unsub(MessagingEventType.TwinejsCommandEditResponse, commandEditResponseHandler);
        };
      }

      messagingService.sub(MessagingEventType.TwinejsCommandEditResponse, commandEditResponseHandler);

      return () => {
        messagingService.unsub(MessagingEventType.TwinejsCommandEditResponse, commandEditResponseHandler);
      };
    }, [props.editor, props.disabled, messagingService, updateSystemPassages]);


    useEffect(() => {
      const generatePassageResponseHandler = (message: TwinejsGeneratePassageResponseEvent) => {
        const story = stories.at(0);

        if (!story) {
          return;
        }

        dispatch(updateStory(stories, story, {
          passages: story.passages.map(p => {
            if (p.id === message.data.currentPassageUid) {
              return {
                ...p,
                text: message.data.content,
              };
            } else if (p.name === mappersDataNodeName && message.data.mappersPassageContent !== undefined) {
              return {
                ...p,
                text: message.data.mappersPassageContent,
              };
            }

            return p;
          }),
        }))
      };

      if (!messagingService) {
        return;
      }

      messagingService.sub(MessagingEventType.TwinejsGeneratePassageResponse, generatePassageResponseHandler);

      return () => {
        messagingService.unsub(MessagingEventType.TwinejsGeneratePassageResponse, generatePassageResponseHandler);
      };
    }, [dispatch, stories, messagingService]);

    const generateClickHandler = useCallback(() => {
      if (!messagingService) {
        return;
      }

      const activePassageId = dialogs.at(0)?.props?.passageIds?.[0];
      const story = stories.at(0);

      if (!story || !activePassageId) {
        throw new Error('Invalid story passage selected');
      }

      messagingService.send(new TwinejsGeneratePassageEvent({
        passages: story.passages
          .filter((p) => !['Startup', 'Footer', 'Images', 'Mappers'].includes(p.name))
          .map(p => ({
            uid: p.id,
            name: p.name,
            content: p.text,
          })),
        currentPassageUid: activePassageId
      }));
    }, [messagingService, stories, dialogs]);

    const botClickHandler = useCallback(() => {
      if (!props.editor || !messagingService) {
        return;
      }

      const cursorPosition = props.editor.indexFromPos(props.editor.getCursor());
      const activePassageId = dialogs.at(0)?.props?.passageIds?.[0];

      messagingService.send(new TwinejsCommandEditEvent({
        command: TwineCustomCommand.Bot,
        initialValue: null,
        startPosition: cursorPosition,
        endPosition: cursorPosition,
        currentPassageName: activePassageId && stories.at(0)?.passages.find(p => p.id === activePassageId)?.name,
      }));
    }, [props.editor, messagingService, stories, dialogs]);

    const createActionClickHandler = useCallback(() => {
      if (!props.editor || !messagingService) {
        return;
      }

      const cursorPosition = props.editor.indexFromPos(props.editor.getCursor());
      const activePassageId = dialogs.at(0)?.props?.passageIds?.[0];

      messagingService.send(new TwinejsCommandEditEvent({
        command: TwineCustomCommand.Action,
        initialValue: null,
        startPosition: cursorPosition,
        endPosition: cursorPosition,
        currentPassageName: activePassageId && stories.at(0)?.passages.find(p => p.id === activePassageId)?.name,
      }));
    }, [props.editor, messagingService, stories, dialogs]);

    const createTriggerClickHandler = useCallback(() => {
      if (!props.editor || !messagingService) {
        return;
      }

      const cursorPosition = props.editor.indexFromPos(props.editor.getCursor());
      const activePassageId = dialogs.at(0)?.props?.passageIds?.[0];

      messagingService.send(new TwinejsCommandEditEvent({
        command: TwineCustomCommand.Trigger,
        initialValue: null,
        startPosition: cursorPosition,
        endPosition: cursorPosition,
        currentPassageName: activePassageId && stories.at(0)?.passages.find(p => p.id === activePassageId)?.name,
      }));
    }, [props.editor, messagingService, stories, dialogs]);

    const createChatTriggerClickHandler = useCallback(() => {
      if (!props.editor || !messagingService) {
        return;
      }

      const cursorPosition = props.editor.indexFromPos(props.editor.getCursor());
      const activePassageId = dialogs.at(0)?.props?.passageIds?.[0];

      messagingService.send(new TwinejsCommandEditEvent({
        command: TwineCustomCommand.ChatTrigger,
        initialValue: null,
        startPosition: cursorPosition,
        endPosition: cursorPosition,
        currentPassageName: activePassageId && stories.at(0)?.passages.find(p => p.id === activePassageId)?.name,
      }));
    }, [props.editor, messagingService, stories, dialogs]);

    const createChatTriggerOffHandler = useCallback(() => {
      if (!props.editor || !messagingService) {
        return;
      }

      const cursorPosition = props.editor.indexFromPos(props.editor.getCursor());
      const activePassageId = dialogs.at(0)?.props?.passageIds?.[0];

      messagingService.send(new TwinejsCommandEditEvent({
        command: TwineCustomCommand.ChatTriggerOff,
        initialValue: null,
        startPosition: cursorPosition,
        endPosition: cursorPosition,
        currentPassageName: activePassageId && stories.at(0)?.passages.find(p => p.id === activePassageId)?.name,
      }));
    }, [props.editor, messagingService, stories, dialogs]);

    useEffect(() => {
      if (!props.editor || !messagingService) {
        return;
      }

      const widgets = [...selectedCommandsMap.entries()].map(([type, data], index) => {
        if (!props.editor) {
          throw new Error('Unexpected editor state');
        }

        const div = document.createElement("div");

        ReactDOM.render(
          <div className="command-edit-widget-wrapper">
            <EditCommandButton key={`edit-command-button-${index}`} onClick={() => {
              if (!props.editor || !messagingService) {
                throw new Error('Unexpected editor state');
              }

              const activePassageId = dialogs.at(0)?.props?.passageIds?.[0];

              messagingService.send(new TwinejsCommandEditEvent({
                command: type,
                initialValue: data.value,
                startPosition: data.startPosition,
                endPosition: data.endPosition,
                currentPassageName: activePassageId && stories.at(0)?.passages.find(p => p.id === activePassageId)?.name,
              }));
            }} />
            {index === selectedCommandsMap.size - 1 && <RemoveCommandButton onClick={() => {
              if (!props.editor) {
                return;
              }
              
              props.editor.replaceRange(
                '',
                props.editor.posFromIndex(data.startPosition),
                props.editor.posFromIndex(data.endPosition)
              )
            }} />}
          </div>,
          div
        );

        div.style.zIndex = '2';
        props.editor.addWidget(props.editor.posFromIndex(data.endPosition), div, true);

        return div;
      });

      return () => {
        widgets.forEach(div => div.remove());
      };
    }, [props.editor, stories, dialogs, messagingService, selectedCommandsMap]);

    useEffect(() => {
      let widgets: Array<HTMLDivElement> = [];

      const createEvidenceButtons = throttle(() => {
        widgets.forEach(div => div.remove());

        const editor: Editor | undefined = props.editor;

        if (!editor || !messagingService) {
          return;
        }

        const value = editor.getValue();

        const evidenceItems = extractEvidence(value);

        widgets = evidenceItems.map((evidence, index) => {
          if (!props.editor) {
            throw new Error('Unexpected editor state');
          }

          const div = document.createElement("div");

          ReactDOM.render(
            <div className="evidence-edit-widget-wrapper">
              <EditEvidenceButton key={`edit-evidence-button-${index}`} onClick={() => {
                if (!props.editor || !messagingService) {
                  throw new Error('Unexpected editor state');
                }

                messagingService.send(new TwinejsEditEvidenceEvent({
                  evidenceName: evidence.evidenceName,
                }));
              }} />
            </div>,
            div
          );

          div.style.zIndex = '2';
          props.editor.addWidget(props.editor.posFromIndex(evidence.startPosition), div, true);

          return div;
        });
      }, 500);

      props.editor?.on('change', createEvidenceButtons);

      const timeout = setTimeout(() => {
        createEvidenceButtons();
      }, 200);

      return () => {
        props.editor?.off('change', createEvidenceButtons)
        clearTimeout(timeout);
        widgets.forEach(div => div.remove());
      };
    }, [props.editor, messagingService]);

    return <>
      <div className="wolfgames-toolbar">
        <IconButton
          key="wolfgames-generate-button"
          disabled={props.disabled}
          icon={<IconWand />}
          iconOnly={false}
          label="Generate"
          onClick={generateClickHandler}
        />
        <MenuButton
          key="wolfgames-commands-menu-button"
          disabled={props.disabled || !!selectedCommandsMap.size}
          icon={<IconCirclePlus />}
          label="Macros"
          items={[
            {
              disabled: props.disabled || !!selectedCommandsMap.size,
              label: 'Add Action',
              onClick: createActionClickHandler,
            },
            {
              disabled: props.disabled || !!selectedCommandsMap.size,
              label: 'Add Trigger',
              onClick: createTriggerClickHandler,
            },
            {
              disabled: props.disabled || !!selectedCommandsMap.size,
              label: 'Add Chat Trigger',
              onClick: createChatTriggerClickHandler,
            },
            {separator: true},
            {
              disabled: props.disabled || !!selectedCommandsMap.size,
              label: 'Disable Chat Trigger',
              onClick: createChatTriggerOffHandler,
            },
          ] satisfies (LabeledMenuItem | MenuSeparator)[]}
        />
        <IconButton
          key="wolfgames-bot-button"
          disabled={props.disabled || !!selectedCommandsMap.size}
          icon={<IconMessageCircle />}
          iconOnly={false}
          label="ADA"
          onClick={botClickHandler}
        />
      </div>
      <StoryFormatToolbar {...props} />
    </>;
  };

  WithWolfgames.displayName = `withWolfgames(${StoryFormatToolbar.displayName || StoryFormatToolbar.name})`;

  return WithWolfgames;
};
