import { useEffect, useState } from 'react';

import { useAppSelector } from '../../../store';
import { getMediaServerConn } from '../../../helpers/livekit/utils';
import { CurrentConnectionEvents } from '../../../helpers/livekit/types';

export const useMainAreaState = () => {
  const currentConnection = getMediaServerConn();

  const columnCameraWidth = useAppSelector(
    (state) => state.roomSettings.columnCameraWidth,
  );
  const columnCameraPosition = useAppSelector(
    (state) => state.roomSettings.columnCameraPosition,
  );
  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveParticipantsPanel,
  );
  const isActiveScreenSharingView = useAppSelector(
    (state) => state.roomSettings.activeScreenSharingView,
  );
  const isActiveWebcamsView = useAppSelector(
    (state) => state.roomSettings.activateWebcamsView,
  );
  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const isActiveExternalMediaPlayer = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );
  const isActiveDisplayExternalLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveChatPanel,
  );
  const isActivePollsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActivePollsPanel,
  );
  const screenHeight = useAppSelector(
    (state) => state.bottomIconsActivity.screenHeight,
  );
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const headerVisible = useAppSelector(
    (state) => state.roomSettings.visibleHeader,
  );
  const footerVisible = useAppSelector(
    (state) => state.roomSettings.visibleFooter,
  );

  const [hasScreenShareSubscribers, setHasScreenShareSubscribers] =
    useState<boolean>(false);
  const [hasVideoSubscribers, setHasVideoSubscribers] =
    useState<boolean>(false);

  useEffect(() => {
    // Set initial values on boot up
    setHasScreenShareSubscribers(
      currentConnection.screenShareTracksMap.size > 0,
    );
    setHasVideoSubscribers(currentConnection.videoSubscribersMap.size > 0);

    // Set up listeners for future changes
    currentConnection.on(
      CurrentConnectionEvents.ScreenShareStatus,
      setHasScreenShareSubscribers,
    );
    currentConnection.on(
      CurrentConnectionEvents.VideoStatus,
      setHasVideoSubscribers,
    );

    return () => {
      currentConnection.off(
        CurrentConnectionEvents.ScreenShareStatus,
        setHasScreenShareSubscribers,
      );
      currentConnection.off(
        CurrentConnectionEvents.VideoStatus,
        setHasVideoSubscribers,
      );
    };
  }, [currentConnection]);

  return {
    columnCameraWidth,
    columnCameraPosition,
    isActiveParticipantsPanel,
    isActiveScreenSharingView,
    hasScreenShareSubscribers,
    isActiveWebcamsView,
    hasVideoSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isActiveChatPanel,
    isActivePollsPanel,
    screenHeight,
    screenWidth,
    headerVisible,
    footerVisible,
  };
};
