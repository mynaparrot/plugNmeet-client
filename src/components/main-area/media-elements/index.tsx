import React, { useState, useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { LocalParticipant, RemoteParticipant, Room } from 'livekit-client';

import { RootState, store, useAppSelector } from '../../../store';
import ScreenShareElements from './screenshare';
import AudioElements from './audios';
import VideoElements from './videos';
import SharedNotepadElement from '../shared-notepad';
import { IScreenShareInfo } from '../../../helpers/livekit/ConnectLivekit';

interface MediaElementsComponentProps {
  currentRoom: Room;
  audioSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  screenShareInfo?: Map<string, IScreenShareInfo>;
}
const isActiveScreenSharingSelector = createSelector(
  (state: RootState) => state.session.screenSharing,
  (screenSharing) => screenSharing.isActive,
);
const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);

const activeScreenSharingViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activeScreenSharingView,
  (activeScreenSharingView) => activeScreenSharingView,
);

const isActiveSharedNotePadSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveSharedNotePad,
  (isActiveSharedNotePad) => isActiveSharedNotePad,
);

const MediaElementsComponent = ({
  audioSubscribers,
  videoSubscribers,
  screenShareInfo,
}: MediaElementsComponentProps) => {
  const isActiveScreenSharing = useAppSelector(isActiveScreenSharingSelector);
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);
  const activeScreenSharingView = useAppSelector(
    activeScreenSharingViewSelector,
  );
  const isActiveSharedNotePad = useAppSelector(isActiveSharedNotePadSelector);
  const [webcamPerPage, setWebcamPerPage] = useState<number>(
    (window as any).NUMBER_OF_WEBCAMS_PER_PAGE_PC ?? 25,
  );

  useEffect(() => {
    const deviceType = store.getState().session.userDeviceType;
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      setWebcamPerPage((window as any).NUMBER_OF_WEBCAMS_PER_PAGE_MOBILE ?? 6);
    }
  }, []);

  const shouldShowWebcams = () => {
    if (!activateWebcamsView) {
      return false;
    }
    if (!activeScreenSharingView) {
      return true;
    }
    return !isActiveScreenSharing;
  };

  const shouldShowScreenSharing = () => {
    if (!activeScreenSharingView) {
      return false;
    }
    return isActiveScreenSharing;
  };

  const shouldShowSharedNotepad = () => {
    if (isActiveScreenSharing) {
      return false;
    }

    return isActiveSharedNotePad;
  };

  const render = () => {
    return (
      <React.Fragment>
        {shouldShowScreenSharing() && screenShareInfo ? (
          <ScreenShareElements
            videoSubscribers={videoSubscribers}
            screenShareInfo={screenShareInfo}
          />
        ) : null}
        {shouldShowSharedNotepad() ? (
          <SharedNotepadElement videoSubscribers={videoSubscribers} />
        ) : null}
        {shouldShowWebcams() && videoSubscribers ? (
          <VideoElements
            videoSubscribers={videoSubscribers}
            perPage={webcamPerPage}
          />
        ) : null}
        {audioSubscribers ? (
          <AudioElements audioSubscribers={audioSubscribers} />
        ) : null}
      </React.Fragment>
    );
  };

  return <React.Fragment>{render()}</React.Fragment>;
};

export default MediaElementsComponent;
