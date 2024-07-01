import * as React from 'react';
import * as ReactDOM from 'react-dom';
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

const findWrappingBrackets = (s: string, startPosition: number, endPosition: number) => {
  let leftCursor = startPosition;
  let rightCursor = endPosition;

  let leftClosedCount = 0;
  let rightOpenedCount = 0;

  do {
    if (rightCursor >= s.length || leftCursor < 0) {
      return null;
    }
    if (s[rightCursor] === '(' && rightCursor !== endPosition) {
      rightOpenedCount++;
    }
    if (s[leftCursor] === ')' && leftCursor !== startPosition) {
      leftClosedCount++;
    }
    if (s[rightCursor] !== ')') {
      rightCursor++;
    } else if (rightOpenedCount > 0) {
      rightOpenedCount--;
      rightCursor++;
    }
    if (s[leftCursor] !== '(') {
      leftCursor--;
    } else if (leftClosedCount > 0) {
      leftClosedCount--;
      leftCursor--;
    }
  } while (s[rightCursor] !== ')' || s[leftCursor] !== '(' || rightOpenedCount > 0 || leftClosedCount > 0);

  return {
    start: leftCursor,
    end: rightCursor,
  };
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
      // TODO: deal with a bug when "(" or ")" counts for command parsing
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
      if (!props.editor || !messagingService) {
        return;
      }

      const botEditResponseHandler = (message: TwinejsCommandEditResponseEvent) => {
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

      messagingService.sub(MessagingEventType.TwinejsCommandEditResponse, botEditResponseHandler);

      return () => {
        messagingService.unsub(MessagingEventType.TwinejsCommandEditResponse, botEditResponseHandler);
      };
    }, [props.editor, messagingService, updateSystemPassages]);

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

    return <>
      <div className="wolfgames-toolbar">
        <IconButton
          key="wolfgames-generate-button"
          disabled={props.disabled}
          icon={<IconWand />}
          iconOnly={false}
          label="Generate"
          onClick={() => {
            console.log('CLICKED');
          }}
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
