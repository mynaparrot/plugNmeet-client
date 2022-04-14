import React from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import { RootState, useAppSelector } from '../../../../store';
import VideoElements from '../videos';

interface IVerticalWebcamsProps {
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
const VerticalWebcams = ({ videoSubscribers }: IVerticalWebcamsProps) => {
  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);

  // we won't show video elements if both
  // chat & participant panel active
  const shouldShowVideoElems = (): boolean => {
    if (!activateWebcamsView) {
      return false;
    }
    return !(isActiveChatPanel && isActiveParticipantsPanel);
  };

  return (
    <>
      {videoSubscribers && shouldShowVideoElems() ? (
        <VideoElements
          videoSubscribers={videoSubscribers}
          perPage={3}
          VerticalWebcam={'vertical-webcams'}
        />
      ) : null}
    </>
  );
};

export default React.memo(VerticalWebcams);
