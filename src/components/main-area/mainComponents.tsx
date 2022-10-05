import React, { useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Room } from 'livekit-client';

import { RootState, useAppSelector } from '../../store';
import ScreenShareElements from '../media-elements/screenshare';
import AudioElements from '../media-elements/audios';
import SharedNotepadElement from '../shared-notepad';
import Whiteboard from '../whiteboard';
import ExternalMediaPlayer from '../external-media-player';
import DisplayExternalLink from '../display-external-link';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../helpers/livekit/types';
import VideosComponent from '../media-elements/videos';

interface IMainComponentsProps {
  currentRoom: Room;
  currentConnection: IConnectLivekit;
}
const isActiveScreenSharingSelector = createSelector(
  (state: RootState) => state.session.screenSharing,
  (screenSharing) => screenSharing.isActive,
);
const activeScreenSharingViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activeScreenSharingView,
  (activeScreenSharingView) => activeScreenSharingView,
);
const isActiveSharedNotePadSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveSharedNotePad,
  (isActiveSharedNotePad) => isActiveSharedNotePad,
);
const isActiveWhiteboardSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveWhiteboard,
  (isActiveWhiteboard) => isActiveWhiteboard,
);
const isActiveExternalMediaPlayerSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features.is_active,
  (is_active) => is_active,
);
const isActiveDisplayExternalLinkSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .display_external_link_features.is_active,
  (is_active) => is_active,
);

const MainComponents = ({ currentConnection }: IMainComponentsProps) => {
  const isActiveScreenSharing = useAppSelector(isActiveScreenSharingSelector);
  const activeScreenSharingView = useAppSelector(
    activeScreenSharingViewSelector,
  );
  const isActiveSharedNotePad = useAppSelector(isActiveSharedNotePadSelector);
  const isActiveWhiteboard = useAppSelector(isActiveWhiteboardSelector);
  const isActiveExternalMediaPlayer = useAppSelector(
    isActiveExternalMediaPlayerSelector,
  );
  const isActiveDisplayExternalLink = useAppSelector(
    isActiveDisplayExternalLinkSelector,
  );
  const [showFullVideoView, setShowFullVideoView] = useState<boolean>(false);
  const [showVerticalVideoView, setShowVerticalVideoView] =
    useState<boolean>(false);
  const [hasVideoElms, setHasVideoElms] = useState<boolean>(false);

  useEffect(() => {
    if (
      !isActiveScreenSharing &&
      !isActiveSharedNotePad &&
      !isActiveWhiteboard &&
      !isActiveExternalMediaPlayer &&
      !isActiveDisplayExternalLink
    ) {
      setShowFullVideoView(true);
      setShowVerticalVideoView(false);
    } else {
      setShowFullVideoView(false);
      setShowVerticalVideoView(true);
    }
  }, [
    isActiveScreenSharing,
    isActiveSharedNotePad,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
  ]);

  useEffect(() => {
    currentConnection.on(CurrentConnectionEvents.VideoStatus, setHasVideoElms);
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.VideoStatus,
        setHasVideoElms,
      );
    };
  }, [currentConnection]);

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

  const shouldShowWhiteboard = () => {
    if (isActiveScreenSharing) {
      return false;
    }
    return isActiveWhiteboard;
  };

  const shouldShowExternalMediaPlayer = () => {
    if (isActiveScreenSharing) {
      return false;
    }
    return isActiveExternalMediaPlayer;
  };

  const shouldDisplayExternalLink = () => {
    if (isActiveScreenSharing) {
      return false;
    }
    return isActiveDisplayExternalLink;
  };

  const videoElms = useMemo(() => {
    return (
      <VideosComponent
        currentConnection={currentConnection}
        isVertical={showVerticalVideoView}
      />
    );
  }, [currentConnection, showVerticalVideoView]);

  return (
    <>
      {shouldShowScreenSharing() ? (
        <div className="middle-fullscreen-wrapper share-screen-wrapper is-share-screen-running">
          {videoElms}
          <ScreenShareElements currentConnection={currentConnection} />
        </div>
      ) : null}
      {shouldShowSharedNotepad() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoElms}
          <SharedNotepadElement />
        </div>
      ) : null}
      {shouldShowWhiteboard() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoElms}
          <Whiteboard />
        </div>
      ) : null}
      {shouldShowExternalMediaPlayer() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoElms}
          <ExternalMediaPlayer />
        </div>
      ) : null}
      {shouldDisplayExternalLink() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoElms}
          <DisplayExternalLink />
        </div>
      ) : null}
      {showFullVideoView ? videoElms : null}
      <AudioElements currentConnection={currentConnection} />
    </>
  );
};

export default MainComponents;
