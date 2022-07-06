import React from 'react';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';

import VerticalWebcams from '../main-area/media-elements/vertical-webcams';
import { RootState, useAppSelector } from '../../store';

interface IDisplayExternalLinkProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const isActiveSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .display_external_link_features.is_active,
  (is_active) => is_active,
);
const linkSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .display_external_link_features.link,
  (url) => url,
);

const DisplayExternalLink = ({
  videoSubscribers,
}: IDisplayExternalLinkProps) => {
  const link = useAppSelector(linkSelector);
  const isActive = useAppSelector(isActiveSelector);

  const render = () => {
    if (!link || link === '') {
      return null;
    }
    return <>DisplayExternalLink</>;
  };

  return (
    <>
      {isActive ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {/*{if videoSubscribers has webcams}*/}
          <VerticalWebcams videoSubscribers={videoSubscribers} />

          {render()}
        </div>
      ) : null}
    </>
  );
};

export default DisplayExternalLink;
