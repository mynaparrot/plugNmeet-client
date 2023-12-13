import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppSelector } from '../../../../store';
import StartPlaybackModal from './start';

const externalMediaPlayerIsActiveSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features,
  (external_media_player_features) => external_media_player_features?.is_active,
);

const ExternalMediaPlayerModal = () => {
  const externalMediaPlayerIsActive = useAppSelector(
    externalMediaPlayerIsActiveSelector,
  );

  return (
    <>
      {!externalMediaPlayerIsActive ? (
        <StartPlaybackModal isActive={externalMediaPlayerIsActive ?? false} />
      ) : null}
    </>
  );
};

export default ExternalMediaPlayerModal;
