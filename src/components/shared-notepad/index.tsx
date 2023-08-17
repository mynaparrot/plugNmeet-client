import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import { RootState, store, useAppSelector } from '../../store';

const sharedNotepadFeaturesSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.shared_note_pad_features,
  (shared_note_pad_features) => shared_note_pad_features,
);
const lockSharedNotepadSelector = createSelector(
  (state: RootState) =>
    state.session.currentUser?.metadata?.lock_settings?.lock_shared_notepad,
  (lock_shared_notepad) => lock_shared_notepad,
);
const themeSelector = createSelector(
  (state: RootState) => state.roomSettings.theme,
  (theme) => theme,
);

const SharedNotepadElement = () => {
  const sharedNotepadFeatures = useAppSelector(sharedNotepadFeaturesSelector);
  const lockSharedNotepad = useAppSelector(lockSharedNotepadSelector);
  const theme = useAppSelector(themeSelector);
  const { i18n } = useTranslation();

  const currentUser = store.getState().session.currentUser;
  const [loaded, setLoaded] = useState<boolean>();
  const [url, setUrl] = useState<string | null>();

  const getUserColor = () => {
    let userColor = sessionStorage.getItem('shared-notepad-user-color');
    if (!userColor) {
      userColor = ((Math.random() * 0xffffff) << 0)
        .toString(16)
        .padStart(6, '0');
      sessionStorage.setItem('shared-notepad-user-color', userColor);
    }

    return userColor;
  };

  useEffect(() => {
    if (sharedNotepadFeatures?.is_active && sharedNotepadFeatures.host) {
      let url = sharedNotepadFeatures.host;
      if (sharedNotepadFeatures.host.match('host.docker.internal')) {
        url = 'http://localhost:9001';
      }

      if (currentUser?.isRecorder) {
        setUrl(
          `${url}/p/${sharedNotepadFeatures.read_only_pad_id}?userName=${currentUser?.name}`,
        );
        return;
      }

      if (!lockSharedNotepad) {
        url = `${url}/p/${sharedNotepadFeatures.note_pad_id}?userName=${currentUser?.name}`;
      } else {
        url = `${url}/p/${sharedNotepadFeatures.read_only_pad_id}?userName=${currentUser?.name}`;
      }

      url += '&userColor=%23' + getUserColor() + '&lang=' + i18n.languages[0];

      if (theme === 'dark') {
        url += '&theme=monokai';
      } else {
        url += '&theme=normal';
      }

      setUrl(url);
    } else {
      setUrl(null);
    }
    //eslint-disable-next-line
  }, [sharedNotepadFeatures, lockSharedNotepad, theme, i18n.languages]);

  const onLoad = () => {
    setLoaded(true);
  };

  const render = () => {
    if (url) {
      return (
        <div className="notepad-wrapper m-auto h-[calc(100%-50px)] w-full max-w-[1100px] flex-1 sm:px-5 mt-9">
          {!loaded ? (
            <div className="loading absolute left-[50%] top-[40%] flex justify-center">
              <div className="lds-ripple">
                <div className="border-secondaryColor"></div>
                <div className="border-secondaryColor"></div>
              </div>
            </div>
          ) : null}
          <iframe height="100%" width="100%" src={url} onLoad={onLoad} />
        </div>
      );
    } else {
      return null;
    }
  };

  return <>{render()}</>;
};

export default SharedNotepadElement;
