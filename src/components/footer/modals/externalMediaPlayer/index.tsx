import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppSelector } from '../../../../store';
import StartPlaybackModal from './start';

const externalMediaPlayerIsActiveSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.roomFeatures
      .externalMediaPlayerFeatures,
  (externalMediaPlayerFeatures) => externalMediaPlayerFeatures?.isActive,
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
