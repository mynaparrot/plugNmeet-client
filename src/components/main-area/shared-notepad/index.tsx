import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { updateIsActiveParticipantsPanel } from '../../../store/slices/bottomIconsActivitySlice';
import VideoElements from '../media-elements/videos';

interface ISharedNotepadProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const isActiveParticipantsPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveParticipantsPanel,
  (isActiveParticipantsPanel) => isActiveParticipantsPanel,
);
const isActiveChatPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveChatPanel,
  (isActiveChatPanel) => isActiveChatPanel,
);
const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);
const sharedNotepadFeaturesSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.shared_note_pad_features,
  (shared_note_pad_features) => shared_note_pad_features,
);

const SharedNotepadElement = ({ videoSubscribers }: ISharedNotepadProps) => {
  const dispatch = useAppDispatch();

  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);
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
        <div className="notepad-wrapper h-full w-full flex-1 sm:px-5">
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

  // we won't show video elements if both
  // chat & participant panel active
  const shouldShowVideoElems = (): boolean => {
    if (!activateWebcamsView) {
      return false;
    }
    return !(isActiveChatPanel && isActiveParticipantsPanel);
  };

  return (
    <div className="shared-notepad-wrapper h-full">
      {/*{if videoSubscribers has webcams}*/}
      {videoSubscribers && shouldShowVideoElems() ? (
        <VideoElements videoSubscribers={videoSubscribers} perPage={3} />
      ) : null}

      {render()}
    </div>
  );
};

export default React.memo(SharedNotepadElement);
