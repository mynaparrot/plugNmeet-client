import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { withCollaboration } from '@blocknote/core/yjs';

// @ts-ignore
import '@blocknote/core/fonts/inter.css';
// @ts-ignore
import '@blocknote/mantine/style.css';

import type { NotepadSnapshot } from './NotepadController';

interface INotepadEditorProps {
  snapshot: NotepadSnapshot;
  userId?: string;
  userName?: string;
  editable: boolean;
  theme: 'light' | 'dark';
}

const getUserColor = () => {
  let color = sessionStorage.getItem('shared-notepad-user-color');
  if (!color) {
    color = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0');
    sessionStorage.setItem('shared-notepad-user-color', color);
  }
  return `#${color}`;
};

const NotepadEditor = ({
  snapshot,
  userId,
  userName,
  editable,
  theme,
}: INotepadEditorProps) => {
  const { t } = useTranslation();

  const user = useMemo(
    () => ({
      id: userId,
      name: userName ?? '',
      color: getUserColor(),
    }),
    [userId, userName],
  );

  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider: { awareness: snapshot.awareness ?? undefined },
        fragment: snapshot.fragment!,
        user,
        renderCursor: (collabUser) => {
          const caret = document.createElement('span');
          caret.style.position = 'absolute';
          caret.style.borderLeft = `2px solid ${collabUser.color}`;
          caret.style.height = '1.2em';
          caret.style.width = '0';

          const label = document.createElement('span');
          label.style.position = 'absolute';
          label.style.top = '-1.5em';
          label.style.left = '0';
          label.style.padding = '1px 6px';
          label.style.borderRadius = '4px';
          label.style.backgroundColor = collabUser.color;
          label.style.color = '#ffffff';
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
    [snapshot.fragment, snapshot.awareness, snapshot.generation],
  );

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end px-2 py-1">
        <button
          type="button"
          className="focus-ring cursor-pointer text-xs text-Gray-600 dark:text-Gray-300"
          onClick={exportMarkdown}
        >
          {t('footer.modal.export-notepad')}
        </button>
      </div>
      <div className="flex-1 overflow-hidden border-t border-Gray-100 dark:border-Gray-800">
        <BlockNoteView editor={editor} theme={theme} editable={editable} />
      </div>
    </div>
  );
};

export default NotepadEditor;
