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

const MARKDOWN_FORMATTING_INSTRUCTION =
  'Format your response using Markdown when it improves clarity: use headings and subheadings for longer answers, bullet or numbered lists, bold/italic emphasis, and fenced code blocks for code.';

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

export const runNotepadAI = async (
  editor: BlockNoteEditor,
  action: NotepadAIAction,
  customPrompt?: string,
  scrollToBottom?: () => void,
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

  const basePrompt =
    action === 'custom'
      ? `${customPrompt}\n\n${text.trim()}`
      : NOTEPAD_AI_PROMPTS[action](text.trim());

  const prompt = `${basePrompt}\n\n${MARKDOWN_FORMATTING_INSTRUCTION}`;
  const toastId = toast.loading(i18n.t('insights.notepad-ai.generating'));

  try {
    const result = await executeNotepadAI(prompt);
    const blocks = editor.tryParseMarkdownToBlocks(result);

    if (action === 'continue-writing') {
      const insertedBlocks = editor.insertBlocks(blocks, cursorBlock, 'after');
      const insertedBlock = insertedBlocks[0];

      if (insertedBlock) {
        editor.setTextCursorPosition(insertedBlock, 'end');
        editor.focus();
        scrollToBottom?.();
      }
    } else {
      const selectedBlocks = editor.getSelection()?.blocks;
      let resultBlock: Block<any, any, any> | undefined;

      if (selectedBlocks && selectedBlocks.length > 0) {
        const { insertedBlocks } = editor.replaceBlocks(selectedBlocks, blocks);
        resultBlock = insertedBlocks[0];
      } else {
        const { insertedBlocks } = editor.replaceBlocks([cursorBlock], blocks);
        resultBlock = insertedBlocks[0];
      }

      if (resultBlock) {
        editor.setTextCursorPosition(resultBlock, 'end');
        editor.focus();
        scrollToBottom?.();
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
    subtext: i18n.t('insights.notepad-ai.sub-title'),
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
