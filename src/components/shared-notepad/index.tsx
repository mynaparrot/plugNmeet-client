import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import Draggable from 'react-draggable';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { updateIsActiveSharedNotePad } from '../../store/slices/bottomIconsActivitySlice';
import { getNotepadController } from './NotepadController';
import NotepadEditor, { type NotepadEditorHandle } from './NotepadEditor';
import { LoadingIcon } from '../../assets/Icons/Loading';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';
import { DownloadIconSVG } from '../../assets/Icons/DownloadIconSVG';

const SharedNotepad = () => {
  const { t } = useTranslation();
  const { currentUser } = useMemo(() => {
    const session = store.getState().session;
    return {
      currentUser: session.currentUser,
    };
  }, []);
  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const dispatch = useAppDispatch();
  const nodeRef = useRef(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const notepadEditorRef = useRef<NotepadEditorHandle>(null);

  const controller = useMemo(() => getNotepadController(), []);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const lockSharedNotepad = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockSharedNotepad,
  );
  const editable = !currentUser?.isRecorder && !lockSharedNotepad;

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

  return (
    <div
      className={
        isActiveSharedNotePad
          ? 'w-full notepadMainParent absolute h-full z-10 top-0 left-0 pointer-events-none'
          : 'hidden'
      }
    >
      <div className="notepad-wrapper h-[calc(100%-50px)] mt-9 flex items-end justify-center">
        <Draggable
          handle="#draggable-h1"
          nodeRef={nodeRef}
          bounds="#main-area"
          cancel=".notepad-close-btn, .notepad-export-btn"
        >
          <div
            className="h-[calc(100%-80px)] w-full max-w-[550px] max-h-[500px] relative pointer-events-auto rounded-xl"
            ref={nodeRef}
          >
            <div className="inner w-full h-full pt-[45px] relative bg-Gray-25 dark:bg-dark-primary rounded-xl">
              <div
                id="draggable-h1"
                className="absolute top-0 w-full flex items-center justify-between cursor-move text-base font-medium leading-7 text-Gray-950 dark:text-white px-4 py-2 border border-Gray-100 dark:border-Gray-800! bg-white dark:bg-dark-primary rounded-t-xl"
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
                  <button
                    ref={closeBtnRef}
                    type="button"
                    aria-label={t('close').toString()}
                    className="cursor-pointer relative z-30 focus-ring notepad-close-btn"
                    onClick={minimizePad}
                  >
                    <PopupCloseSVGIcon classes="text-Gray-600 dark:text-white" />
                  </button>
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
    </div>
  );
};

export default SharedNotepad;
