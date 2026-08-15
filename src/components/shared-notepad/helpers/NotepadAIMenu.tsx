import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  KeyboardEvent,
} from 'react';
import type { BlockNoteEditor } from '@blocknote/core';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import {
  useComponentsContext,
  useSuggestionMenuKeyboardHandler,
} from '@blocknote/react';
import type { DefaultReactSuggestionItem } from '@blocknote/react';

import { AiIconSVG } from '../../../assets/Icons/AiIconSVG';
import i18n from '../../../helpers/i18n';
import { NOTEPAD_AI_PRESET_ACTIONS, runNotepadAI } from './notepadAIActions';

interface INotepadAIMenuProps {
  editor: BlockNoteEditor;
  onClose: () => void;
  scrollToBottom: () => void;
}

const NotepadAIMenu = ({
  editor,
  onClose,
  scrollToBottom,
}: INotepadAIMenuProps) => {
  const Components = useComponentsContext();
  const [prompt, setPrompt] = useState('');

  const items = useMemo<DefaultReactSuggestionItem[]>(() => {
    const presetItems: DefaultReactSuggestionItem[] =
      NOTEPAD_AI_PRESET_ACTIONS.map(({ action, labelKey }) => ({
        title: i18n.t(labelKey),
        size: 'small',
        onItemClick: () => {
          void runNotepadAI(editor, action, undefined, scrollToBottom);
          onClose();
        },
      }));

    return filterSuggestionItems(presetItems, prompt);
  }, [editor, onClose, prompt, scrollToBottom]);

  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, (item) => item.onItemClick());

  // Keep the highlighted item in sync whenever the filtered list changes.
  useEffect(() => {
    setSelectedIndex(0);
  }, [prompt, setSelectedIndex]);

  const runCustomPrompt = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }
    void runNotepadAI(editor, 'custom', trimmed, scrollToBottom);
    onClose();
  }, [editor, onClose, prompt, scrollToBottom]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        if (items.length > 0) {
          // Runs the highlighted preset action.
          handler(event);
        } else {
          event.preventDefault();
          runCustomPrompt();
        }
      } else {
        handler(event);
      }
    },
    [handler, items.length, onClose, runCustomPrompt],
  );

  if (!Components) {
    return null;
  }

  const activeDescendantId =
    items.length > 0 && selectedIndex >= 0 && selectedIndex < items.length
      ? `bn-suggestion-menu-item-${selectedIndex}`
      : undefined;

  return (
    <div className="flex w-full flex-col gap-1">
      <Components.Generic.Form.Root>
        <Components.Generic.Form.TextInput
          className="bn-combobox-input"
          name="notepad-ai-prompt"
          variant="large"
          icon={<AiIconSVG classes="h-4 w-4" />}
          placeholder={i18n.t('insights.notepad-ai.custom-placeholder')}
          autoComplete="off"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-activedescendant={activeDescendantId}
        />
      </Components.Generic.Form.Root>
      {items.length > 0 && (
        <Components.SuggestionMenu.Root
          className="bn-combobox-items"
          id="ai-suggestion-menu"
        >
          {items.map((item, index) => (
            <Components.SuggestionMenu.Item
              key={item.title}
              className="bn-suggestion-menu-item bn-suggestion-menu-item-small"
              id={`bn-suggestion-menu-item-${index}`}
              isSelected={index === selectedIndex}
              onClick={item.onItemClick}
              item={item}
            />
          ))}
        </Components.SuggestionMenu.Root>
      )}
    </div>
  );
};

export default NotepadAIMenu;
