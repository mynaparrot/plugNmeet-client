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

const SharedNotepadElement = ({ videoSubscribers }: ISharedNotepadProps) => {
  const dispatch = useAppDispatch();
  const sharedNotepadFeatures = useAppSelector(sharedNotepadFeaturesSelector);
  const currentUser = store.getState().session.currenUser;
  const [loaded, setLoaded] = useState<boolean>();

  useEffect(() => {
    dispatch(updateIsActiveParticipantsPanel(false));
  }, [dispatch]);

  const onLoad = () => {
    setLoaded(true);
  };

  const render = () => {
    if (sharedNotepadFeatures?.is_active && sharedNotepadFeatures.host) {
      let url = sharedNotepadFeatures.host;
      if (sharedNotepadFeatures.host.match('host.docker.internal')) {
        url = 'http://localhost:9001';
      }
      if (currentUser?.metadata?.is_admin) {
        url = `${url}/p/${sharedNotepadFeatures.note_pad_id}?userName=${currentUser.name}`;
      } else {
        url = `${url}/p/${sharedNotepadFeatures.read_only_pad_id}?userName=${currentUser?.name}`;
      }

      return (
        <div className="notepad-wrapper h-full w-full flex-1">
          {!loaded ? (
            <div className="loading flex justify-center">
              <div className="lds-ripple">
                <div></div>
                <div></div>
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
    <div className="shared-notepad-wrapper h-full">
      {/*{if videoSubscribers has webcams}*/}
      <VerticalWebcams videoSubscribers={videoSubscribers} />

      {render()}
    </div>
  );
};

export default React.memo(SharedNotepadElement);
