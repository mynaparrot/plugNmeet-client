import React from 'react';

import { useAppSelector } from '../../../../store';
import StartPlaybackModal from './start';

const ExternalMediaPlayerModal = () => {
  const externalMediaPlayerIsActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
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
