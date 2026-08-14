import { toast } from 'react-toastify';
import type { Block, BlockNoteEditor } from '@blocknote/core';
import type { DefaultReactSuggestionItem } from '@blocknote/react';

import { AiIconSVG } from '../../../assets/Icons/AiIconSVG';
import i18n from '../../../helpers/i18n';
import { executeNotepadAI } from './notepadAI';

export type NotepadAIAction =
  | 'continue-writing'
  | 'summarize'
  | 'improve-writing'
  | 'fix-spelling'
  | 'simplify'
  | 'custom';

const NOTEPAD_AI_PROMPTS: Record<
  Exclude<NotepadAIAction, 'custom'>,
  (text: string) => string
> = {
  'continue-writing': (text) =>
    `Continue writing the following text in the same tone and style. Return only the continuation, without repeating the original text:\n\n${text}`,
  summarize: (text) => `Summarize the following text concisely:\n\n${text}`,
  'improve-writing': (text) =>
    `Improve the clarity, tone, and style of the following text while preserving its meaning. Return only the improved text:\n\n${text}`,
  'fix-spelling': (text) =>
    `Fix spelling, grammar, and punctuation in the following text. Return only the corrected text:\n\n${text}`,
  simplify: (text) =>
    `Rewrite the following text in simpler language. Return only the simplified text:\n\n${text}`,
};

export const blockToPlainText = (block: Block): string => {
  const content = block.content;
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      const inline = item as unknown as {
        type?: string;
        text?: string;
        content?: Array<{ text?: string }>;
      };
      if (typeof inline.text === 'string') {
        return inline.text;
      }
      if (Array.isArray(inline.content)) {
        return inline.content.map((c) => c.text ?? '').join('');
      }
      return '';
    })
    .join('');
};

/**
 * Scrolls the block with the given id into view within the notepad panel's
 * own scroll container only. Unlike `prosemirrorView`'s `tr.scrollIntoView()`
 * (which walks every ancestor up to `document.body` and can scroll the outer
 * page/window), this walks up the editor DOM to the nearest scrollable
 * ancestor and adjusts only that container's scroll position.
 */
const scrollBlockIntoView = (
  editor: BlockNoteEditor,
  blockId: string,
): void => {
  const domElement = editor.domElement;
  if (!domElement) {
    return;
  }

  // BlockNote renders each block with a `data-id` attribute on its DOM node.
  const blockDom = domElement.querySelector(`[data-id="${blockId}"]`);
  if (!(blockDom instanceof HTMLElement)) {
    return;
  }

  let container: HTMLElement | null = blockDom.parentElement;
  while (
    container &&
    container !== document.body &&
    container !== document.documentElement
  ) {
    const overflowY = getComputedStyle(container).overflowY;
    if (
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay') &&
      container.scrollHeight > container.clientHeight
    ) {
      break;
    }
    container = container.parentElement;
  }

  if (
    !container ||
    container === document.body ||
    container === document.documentElement ||
    container.scrollHeight <= container.clientHeight
  ) {
    return;
  }

  const blockRect = blockDom.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const margin = 12;

  if (blockRect.top < containerRect.top + margin) {
    container.scrollTop += blockRect.top - containerRect.top - margin;
  } else if (blockRect.bottom > containerRect.bottom - margin) {
    container.scrollTop += blockRect.bottom - containerRect.bottom + margin;
  }
};

export const runNotepadAI = async (
  editor: BlockNoteEditor,
  action: NotepadAIAction,
  customPrompt?: string,
): Promise<void> => {
  const cursorPosition = editor.getTextCursorPosition();
  const cursorBlock = cursorPosition.block;

  let text = editor.getSelectedText();
  if (!text.trim()) {
    text = blockToPlainText(cursorBlock);
  }
  if (!text.trim()) {
    toast(i18n.t('insights.notepad-ai.select-text'), { type: 'error' });
    return;
  }

  const prompt =
    action === 'custom'
      ? `${customPrompt}\n\n${text.trim()}`
      : NOTEPAD_AI_PROMPTS[action](text.trim());
  const toastId = toast.loading(i18n.t('insights.notepad-ai.generating'));

  try {
    const result = await executeNotepadAI(prompt);

    if (action === 'continue-writing') {
      const [insertedBlock] = editor.insertBlocks(
        [{ type: 'paragraph', content: result }],
        cursorBlock,
        'after',
      );

      // Put the text cursor into the newly inserted block and scroll that
      // block into view inside the notepad panel.
      if (insertedBlock) {
        editor.setTextCursorPosition(insertedBlock, 'end');
        editor.focus();
        scrollBlockIntoView(editor, insertedBlock.id);
      }
    } else {
      const selectedBlocks = editor.getSelection()?.blocks;
      let resultBlock: Block<any, any, any> | undefined;
      if (selectedBlocks && selectedBlocks.length > 0) {
        const { insertedBlocks } = editor.replaceBlocks(selectedBlocks, [
          { type: 'paragraph', content: result },
        ]);
        resultBlock = insertedBlocks[0];
      } else {
        resultBlock = editor.updateBlock(cursorBlock, { content: result });
      }

      // Move the cursor to the end of the replaced/updated content and scroll
      // it into view within the notepad panel.
      if (resultBlock) {
        editor.setTextCursorPosition(resultBlock, 'end');
        editor.focus();
        scrollBlockIntoView(editor, resultBlock.id);
      }
    }

    toast.update(toastId, {
      render: i18n.t('insights.notepad-ai.done'),
      type: 'success',
      isLoading: false,
      autoClose: 3000,
    });
  } catch {
    toast.update(toastId, {
      render: i18n.t('insights.notepad-ai.failed'),
      type: 'error',
      isLoading: false,
      autoClose: 3000,
    });
  }
};

export const NOTEPAD_AI_PRESET_ACTIONS: Array<{
  action: Exclude<NotepadAIAction, 'custom'>;
  labelKey: string;
}> = [
  {
    action: 'continue-writing',
    labelKey: 'insights.notepad-ai.continue-writing',
  },
  { action: 'summarize', labelKey: 'insights.notepad-ai.summarize' },
  {
    action: 'improve-writing',
    labelKey: 'insights.notepad-ai.improve-writing',
  },
  {
    action: 'fix-spelling',
    labelKey: 'insights.notepad-ai.fix-spelling',
  },
  { action: 'simplify', labelKey: 'insights.notepad-ai.simplify' },
];

export const getNotepadAISlashMenuItems = (
  editor: BlockNoteEditor,
  onOpen: (blockId: string) => void,
): DefaultReactSuggestionItem[] => [
  {
    title: i18n.t('insights.notepad-ai.title'),
    aliases: ['ai'],
    group: 'AI',
    icon: <AiIconSVG classes="h-4 w-4" />,
    onItemClick: () => {
      const cursor = editor.getTextCursorPosition();
      const block = cursor.block;
      const id = block.id ?? cursor.prevBlock?.id;
      if (id) onOpen(id);
    },
  },
];
