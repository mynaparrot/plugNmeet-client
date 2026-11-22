import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Draggable from 'react-draggable';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import {
  updateIsActiveSharedNotePad,
  updateIsSharedNotepadDocked,
} from '../../store/slices/bottomIconsActivitySlice';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { isWorkspaceControlledByAIAgent } from '../../helpers/aiAgentSession';
import usePrevious from '../whiteboard/helpers/hooks/usePrevious';
import { getNotepadController } from './NotepadController';
import NotepadEditor, { type NotepadEditorHandle } from './NotepadEditor';
import { LoadingIcon } from '../../assets/Icons/Loading';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';
import { DownloadIconSVG } from '../../assets/Icons/DownloadIconSVG';
import { DockPanelIconSVG, FloatWindowIconSVG } from '../../assets/Icons/NotepadModeIconSVG';

const SharedNotepad = () => {
  const { t } = useTranslation();
  const { currentUser, isAdmin, isRecorder } = useMemo(() => {
    const session = store.getState().session;
    return {
      currentUser: session.currentUser,
      isAdmin: !!session.currentUser?.metadata?.isAdmin,
      isRecorder: !!session.currentUser?.isRecorder,
    };
  }, []);
  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const isSharedNotepadDocked = useAppSelector(
    (state) => state.bottomIconsActivity.isSharedNotepadDocked,
  );
  const dispatch = useAppDispatch();
  const nodeRef = useRef(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const notepadEditorRef = useRef<NotepadEditorHandle>(null);

  const controller = useMemo(() => getNotepadController(), []);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const lockSharedNotepad = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockSharedNotepad,
  );
  const defaultRoomLock = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings?.lockSharedNotepad,
  );
  const isAiWorkspaceControlled = useAppSelector(isWorkspaceControlledByAIAgent);
  const isPresenter = useAppSelector((state) => !!state.session.currentUser?.metadata?.isPresenter);
  const isNotepadVisibleByPresenter = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.visible,
  );
  const editable = useMemo(() => {
    if (isRecorder) return false;
    // an admin normally bypasses the pad lock, but the agent owns the pad in its session
    if (isAdmin && !isAiWorkspaceControlled) return true;
    if (typeof lockSharedNotepad === 'boolean') return !lockSharedNotepad;
    return !(defaultRoomLock ?? true);
  }, [isRecorder, isAdmin, isAiWorkspaceControlled, lockSharedNotepad, defaultRoomLock]);

  // An agent unlocking the pad for the participant is worth announcing.
  const wasEditable = usePrevious(editable);
  useEffect(() => {
    if (!isAiWorkspaceControlled || wasEditable !== false || editable !== true) {
      return;
    }
    dispatch(
      addUserNotification({
        message: t('ai-agent.notifications.notepad-unlocked'),
        typeOption: 'info',
      }),
    );
  }, [isAiWorkspaceControlled, wasEditable, editable, dispatch, t]);

  // While the agent (or a remote presenter) owns the pad, only they may close it.
  const hideCloseButton = isAiWorkspaceControlled || (!isPresenter && isNotepadVisibleByPresenter);

  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  // Native `resize: both` writes inline size on `.inner`, which would beat `w-full h-full`.
  const resetFloatingSize = useCallback(() => {
    const inner = innerRef.current;
    if (inner) {
      inner.style.width = '';
      inner.style.height = '';
    }
    setDragPosition({ x: 0, y: 0 });
  }, []);

  // An agent-run session docks the pad so its board stays visible.
  useEffect(() => {
    resetFloatingSize();
    dispatch(updateIsSharedNotepadDocked(isAiWorkspaceControlled));
  }, [isAiWorkspaceControlled, dispatch, resetFloatingSize]);

  const toggleMode = useCallback(() => {
    resetFloatingSize();
    dispatch(updateIsSharedNotepadDocked(!isSharedNotepadDocked));
  }, [dispatch, isSharedNotepadDocked, resetFloatingSize]);

  useEffect(() => {
    if (isActiveSharedNotePad) {
      const timer = setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isActiveSharedNotePad]);

  const minimizePad = useCallback(() => {
    dispatch(updateIsActiveSharedNotePad(false));
  }, [dispatch]);

  const modeClass = (sidePanel: string, floating: string) =>
    isSharedNotepadDocked ? sidePanel : floating;

  const modeToggleLabel = t(
    isSharedNotepadDocked ? 'footer.modal.notepad-floating' : 'footer.modal.notepad-side-panel',
  ).toString();

  return (
    <div
      className={modeClass(
        'notepad-wrapper notepad-side-panel h-full w-full flex border-s border-Gray-200 dark:border-Gray-800',
        'notepad-wrapper h-[calc(100%-50px)] mt-9 flex items-end justify-center',
      )}
    >
      <Draggable
        handle="#draggable-h1"
        nodeRef={nodeRef}
        bounds="#main-area"
        disabled={isSharedNotepadDocked}
        position={isSharedNotepadDocked ? { x: 0, y: 0 } : dragPosition}
        onStop={(_, data) => setDragPosition({ x: data.x, y: data.y })}
        cancel=".notepad-close-btn, .notepad-export-btn, .notepad-mode-btn"
      >
        <div
          className={modeClass(
            'h-full w-full relative pointer-events-auto',
            'h-[calc(100%-80px)] w-full max-w-[550px] max-h-[500px] relative pointer-events-auto rounded-xl',
          )}
          ref={nodeRef}
        >
          <div
            ref={innerRef}
            className={modeClass(
              'inner w-full h-full pt-[45px] relative bg-white dark:bg-dark-surface',
              'inner w-full h-full pt-[45px] relative bg-white dark:bg-dark-surface rounded-xl border border-Gray-200 dark:border-Gray-700 shadow-virtualPOP',
            )}
          >
            <div
              id="draggable-h1"
              className={modeClass(
                'absolute top-0 w-full flex items-center justify-between cursor-default text-sm font-medium leading-7 text-Gray-950 dark:text-white px-3.5 py-2 border-b border-Gray-200 dark:border-Gray-700 bg-white dark:bg-dark-surface',
                'absolute top-0 w-full flex items-center justify-between cursor-move text-base font-medium leading-7 text-Gray-950 dark:text-white px-4 py-2 border-b border-Gray-200 dark:border-Gray-700 bg-white dark:bg-dark-surface rounded-t-xl',
              )}
            >
              <span>{t('footer.modal.shared-notepad')}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={t('footer.modal.export-notepad')}
                  aria-label={t('footer.modal.export-notepad').toString()}
                  className="cursor-pointer focus-ring [&_path]:stroke-current text-Gray-600 dark:text-white notepad-export-btn"
                  onClick={() => notepadEditorRef.current?.exportMarkdown()}
                >
                  <DownloadIconSVG />
                </button>
                {/* an agent-run session keeps the pad docked, so the user cannot float it */}
                {!isAiWorkspaceControlled && (
                  <button
                    type="button"
                    title={modeToggleLabel}
                    aria-label={modeToggleLabel}
                    className="cursor-pointer focus-ring text-Gray-600 dark:text-white notepad-mode-btn"
                    onClick={toggleMode}
                  >
                    {isSharedNotepadDocked ? <FloatWindowIconSVG /> : <DockPanelIconSVG />}
                  </button>
                )}
                {!hideCloseButton && (
                  <button
                    ref={closeBtnRef}
                    type="button"
                    aria-label={t('close').toString()}
                    className="cursor-pointer relative z-30 focus-ring notepad-close-btn"
                    onClick={minimizePad}
                  >
                    <PopupCloseSVGIcon classes="text-Gray-600 dark:text-white" />
                  </button>
                )}
              </div>
            </div>
            {snapshot.fragment && snapshot.awareness ? (
              <NotepadEditor
                ref={notepadEditorRef}
                snapshot={snapshot}
                userId={currentUser?.userId}
                userName={currentUser?.name}
                editable={editable}
                theme={theme === 'dark' ? 'dark' : 'light'}
              />
            ) : (
              <div className="loading-status absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-white/50 dark:bg-black/50">
                <LoadingIcon
                  className="inline h-10 w-10 animate-spin text-gray-200"
                  fillColor="#004D90"
                />
              </div>
            )}
          </div>
        </div>
      </Draggable>
    </div>
  );
};

export default SharedNotepad;
