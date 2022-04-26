import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { updateIsActiveParticipantsPanel } from '../../store/slices/bottomIconsActivitySlice';
import VerticalWebcams from '../main-area/media-elements/vertical-webcams';

interface ISharedNotepadProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const sharedNotepadFeaturesSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.shared_note_pad_features,
  (shared_note_pad_features) => shared_note_pad_features,
);
const lockSharedNotepadSelector = createSelector(
  (state: RootState) =>
    state.session.currenUser?.metadata?.lock_settings?.lock_shared_notepad,
  (lock_shared_notepad) => lock_shared_notepad,
);

const SharedNotepadElement = ({ videoSubscribers }: ISharedNotepadProps) => {
  const dispatch = useAppDispatch();
  const sharedNotepadFeatures = useAppSelector(sharedNotepadFeaturesSelector);
  const lockSharedNotepad = useAppSelector(lockSharedNotepadSelector);
  const currentUser = store.getState().session.currenUser;
  const [loaded, setLoaded] = useState<boolean>();
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    dispatch(updateIsActiveParticipantsPanel(false));
  }, [dispatch]);

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

      setUrl(url);
    }
    //eslint-disable-next-line
  }, [sharedNotepadFeatures, lockSharedNotepad]);

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

  return (
    <div
      className={`middle-fullscreen-wrapper h-full flex ${
        videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
      }`}
    >
      {/*{if videoSubscribers has webcams}*/}
      <VerticalWebcams videoSubscribers={videoSubscribers} />

      {render()}
    </div>
  );
};

export default React.memo(SharedNotepadElement);
