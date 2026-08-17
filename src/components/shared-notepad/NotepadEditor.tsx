import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FC } from 'react';
import {
  BlockPopover,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react';
import type { FormattingToolbarProps } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { withCollaboration } from '@blocknote/core/yjs';
import { filterSuggestionItems } from '@blocknote/core/extensions';

// @ts-ignore
import '@blocknote/core/fonts/inter.css';
// @ts-ignore
import '@blocknote/mantine/style.css';

import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import type { NotepadSnapshot } from './NotepadController';
import NotepadAIToolbarButton from './helpers/NotepadAIToolbarButton';
import NotepadAIMenu from './helpers/NotepadAIMenu';
import NotepadAIDisabledNotice from './helpers/NotepadAIDisabledNotice';
import {
  getNotepadAISlashMenuItems,
  INotepadAISelection,
} from './helpers/notepadAIActions';
import {
  getBlockNoteDictionary,
  getContrastTextColor,
  getUserColor,
} from './helpers/utils';

export interface NotepadEditorHandle {
  exportMarkdown: () => void;
}

interface INotepadEditorProps {
  snapshot: NotepadSnapshot;
  userId?: string;
  userName?: string;
  editable: boolean;
  theme: 'light' | 'dark';
}

const NotepadEditor = forwardRef<NotepadEditorHandle, INotepadEditorProps>(
  ({ snapshot, userId, userName, editable, theme }, ref) => {
    const aiTextChatFeatures = useAppSelector(
      (state) =>
        state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
          ?.aiFeatures?.aiTextChatFeatures,
    );
    const aiEnabled =
      !!aiTextChatFeatures?.isEnabled &&
      !aiTextChatFeatures?.isNotepadAiDisabled &&
      (aiTextChatFeatures?.isAllowedEveryone ||
        (aiTextChatFeatures?.allowedUserIds ?? []).includes(userId ?? ''));
    const onlineUsers = useAppSelector(participantsSelector.selectIds);

    const [aiMenuBlockId, setAiMenuBlockId] = useState<string | undefined>();
    const [aiSelection, setAiSelection] = useState<INotepadAISelection>();

    const { i18n } = useTranslation();

    const dictionary = useMemo(
      () => getBlockNoteDictionary(i18n.language),
      [i18n.language],
    );

    const user = useMemo(
      () => ({
        id: userId,
        name: userName ?? '',
        color: getUserColor(),
        editable,
      }),
      [userId, userName, editable],
    );

    const editor = useCreateBlockNote(
      {
        dictionary,
        ...withCollaboration({
          collaboration: {
            provider: { awareness: snapshot.awareness ?? undefined },
            fragment: snapshot.fragment!,
            user,
            renderCursor: (collabUser) => {
              if (!collabUser.editable || !collabUser.id) {
                return document.createElement('span');
              }

              if (!onlineUsers.includes(collabUser.id)) {
                return document.createElement('span');
              }

              const caret = document.createElement('span');
              caret.style.position = 'absolute';
              caret.style.zIndex = '100';
              caret.style.pointerEvents = 'none';
              caret.style.borderLeft = `2px solid ${collabUser.color}`;
              caret.style.height = '1.2em';
              caret.style.width = '0';

              const label = document.createElement('span');
              label.style.position = 'absolute';
              label.style.top = '1.2em';
              label.style.left = '0';
              label.style.zIndex = '100';
              label.style.pointerEvents = 'none';
              label.style.padding = '1px 6px';
              label.style.borderRadius = '4px';
              label.style.backgroundColor = collabUser.color;
              label.style.color = getContrastTextColor(collabUser.color);
              label.style.fontSize = '11px';
              label.style.fontWeight = '600';
              label.style.lineHeight = '1.4';
              label.style.whiteSpace = 'nowrap';
              label.textContent = collabUser.name;

              caret.appendChild(label);
              return caret;
            },
          },
        }),
      },
      [
        snapshot.fragment,
        snapshot.awareness,
        snapshot.generation,
        dictionary,
        user,
        onlineUsers,
      ],
    );

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    }, []);

    const openAIMenuFromSelection = useCallback(() => {
      const text = editor.getSelectedText();
      if (!text.trim()) {
        return;
      }
      const blocks = editor.getSelection()?.blocks ?? [];
      const cursorBlock = editor.getTextCursorPosition().block;
      setAiSelection({ text, blocks, cursorBlock });
      const anchorId = blocks[0]?.id ?? cursorBlock.id;
      setAiMenuBlockId(anchorId);
    }, [editor]);

    const formattingToolbar = useCallback<FC<FormattingToolbarProps>>(
      (props) => (
        <FormattingToolbar {...props}>
          {getFormattingToolbarItems(props.blockTypeSelectItems)}
          {editable && (
            <NotepadAIToolbarButton onClick={openAIMenuFromSelection} />
          )}
        </FormattingToolbar>
      ),
      [editable, openAIMenuFromSelection],
    );

    // In view-only mode, keep the editor pinned to the latest content so the
    // recorder bot / locked participants always see newly appended content.
    useEffect(() => {
      if (!editable) {
        scrollToBottom();
        return editor.onChange(() => scrollToBottom());
      }
      return undefined;
    }, [editor, editable, scrollToBottom]);

    const exportMarkdown = useCallback(() => {
      const md = editor.blocksToMarkdownLossy();
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shared-notepad-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }, [editor]);

    useImperativeHandle(ref, () => ({ exportMarkdown }), [exportMarkdown]);

    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto border-t border-Gray-200 dark:border-Gray-800"
      >
        <BlockNoteView
          editor={editor}
          theme={theme}
          editable={editable}
          slashMenu={false}
          formattingToolbar={false}
        >
          <FormattingToolbarController formattingToolbar={formattingToolbar} />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                [
                  ...getDefaultReactSlashMenuItems(editor),
                  ...getNotepadAISlashMenuItems(editor, (id) =>
                    setAiMenuBlockId(id),
                  ),
                ],
                query,
              )
            }
          />
          <BlockPopover
            blockId={aiMenuBlockId}
            useFloatingOptions={{
              open: !!aiMenuBlockId,
              placement: 'bottom',
              middleware: [
                {
                  name: 'offset',
                  fn: ({ y }) => ({ y: y + 10 }),
                },
              ],
              onOpenChange: (open) => {
                if (!open) {
                  setAiMenuBlockId(undefined);
                  setAiSelection(undefined);
                }
              },
            }}
            useDismissProps={{
              enabled: !!aiMenuBlockId,
              outsidePress: true,
              escapeKey: true,
            }}
            focusManagerProps={{
              disabled: false,
            }}
            elementProps={{
              style: { zIndex: 100 },
            }}
          >
            {aiMenuBlockId &&
              (aiEnabled ? (
                <NotepadAIMenu
                  editor={editor}
                  onClose={() => setAiMenuBlockId(undefined)}
                  scrollToBottom={scrollToBottom}
                  selection={aiSelection}
                />
              ) : (
                <NotepadAIDisabledNotice />
              ))}
          </BlockPopover>
        </BlockNoteView>
      </div>
    );
  },
);

export default NotepadEditor;
