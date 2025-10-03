import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateIsActiveSharedNotePad } from '../../store/slices/bottomIconsActivitySlice';
import { useNotepadUrl } from './useNotepadUrl';
import { LoadingIcon } from '../../assets/Icons/Loading';

const SharedNotepad = () => {
  const { t } = useTranslation();
  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const dispatch = useAppDispatch();
  const nodeRef = useRef(null);
  const url = useNotepadUrl();

  const [loaded, setLoaded] = useState<boolean>();

  const onLoad = () => {
    setLoaded(true);
  };

  const minimizePad = () => {
    dispatch(updateIsActiveSharedNotePad(false));
  };

  return (
    url && (
      <div
        className={
          isActiveSharedNotePad
            ? 'w-full notepadMainParent absolute h-full z-10 top-0 left-0 pointer-events-none'
            : 'hidden'
        }
      >
        <div className="h-[calc(100%-50px)] mt-9 flex items-end justify-end">
          <Draggable
            handle="#draggable-h1"
            nodeRef={nodeRef}
            bounds="#main-area"
          >
            <div
              className="notepad-wrapper h-[calc(100%-80px)] w-full max-w-[400px] max-h-[500px] cursor-move relative pointer-events-auto"
              ref={nodeRef}
            >
              <div
                id="draggable-h1"
                className="absolute top-2 md:top-0 left-0 h-7 w-full text-white flex items-center justify-center text-sm"
              ></div>
              <div
                className="hide-icon absolute pl-2 w-16 h-7 cursor-pointer flex items-center"
                onClick={minimizePad}
              >
                <div className="h-0.5 w-6 bg-white line"></div>
              </div>
              <div className="inner w-full h-full border-t-28 border-solid border-primary-color">
                {!loaded && (
                  <div className="loading-status absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-white/50 dark:bg-black/50">
                    <LoadingIcon
                      className="inline h-10 w-10 animate-spin text-gray-200"
                      fillColor="#004D90"
                    />
                  </div>
                )}
                <iframe
                  title={t('footer.modal.shared-notepad')}
                  src={url}
                  height="100%"
                  width="100%"
                  onLoad={onLoad}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  allow="clipboard-write; clipboard-read"
                  className="border-0"
                />
              </div>
            </div>
          </Draggable>
        </div>
      </div>
    )
  );
};

export default SharedNotepad;
