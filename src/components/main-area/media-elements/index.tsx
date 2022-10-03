import React from 'react';
import { createSelector } from '@reduxjs/toolkit';
import {
  LocalParticipant,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
} from 'livekit-client';

import { RootState, useAppSelector } from '../../../store';
import ScreenShareElements from './screenshare';
import AudioElements from './audios';
import VideoElements from './videos';
import SharedNotepadElement from '../../shared-notepad';
import Whiteboard from '../../whiteboard';
import ExternalMediaPlayer from '../../external-media-player';
import DisplayExternalLink from '../../display-external-link';
import VerticalWebcams from './vertical-webcams/index';

interface MediaElementsComponentProps {
  currentRoom: Room;
  audioSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  screenShareTracks?: Map<
    string,
    LocalTrackPublication | RemoteTrackPublication
  >;
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

const MediaElementsComponent = ({
  audioSubscribers,
  videoSubscribers,
  screenShareTracks,
}: MediaElementsComponentProps) => {
  const isActiveScreenSharing = useAppSelector(isActiveScreenSharingSelector);
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);
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

  const shouldShowWebcams = () => {
    if (!activateWebcamsView) {
      return false;
    }
    return (
      !isActiveScreenSharing &&
      !isActiveSharedNotePad &&
      !isActiveWhiteboard &&
      !isActiveExternalMediaPlayer &&
      !isActiveDisplayExternalLink
    );
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

  return (
    <>
      {shouldShowScreenSharing() && screenShareTracks ? (
        <div className="middle-fullscreen-wrapper share-screen-wrapper is-share-screen-running">
          <VerticalWebcams videoSubscribers={videoSubscribers} />
          <ScreenShareElements
            // videoSubscribers={videoSubscribers}
            screenShareTracks={screenShareTracks}
          />
        </div>
      ) : null}
      {shouldShowSharedNotepad() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          <VerticalWebcams videoSubscribers={videoSubscribers} />
          <SharedNotepadElement videoSubscribers={videoSubscribers} />
        </div>
      ) : null}
      {shouldShowWhiteboard() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          <VerticalWebcams videoSubscribers={videoSubscribers} />
          <Whiteboard videoSubscribers={videoSubscribers} />
        </div>
      ) : null}
      {shouldShowExternalMediaPlayer() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          <VerticalWebcams videoSubscribers={videoSubscribers} />
          <ExternalMediaPlayer videoSubscribers={videoSubscribers} />
        </div>
      ) : null}
      {shouldDisplayExternalLink() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          <VerticalWebcams videoSubscribers={videoSubscribers} />
          <DisplayExternalLink videoSubscribers={videoSubscribers} />
        </div>
      ) : null}
      {shouldShowWebcams() && videoSubscribers ? (
        <VideoElements videoSubscribers={videoSubscribers} />
      ) : null}
      {audioSubscribers ? (
        <AudioElements audioSubscribers={audioSubscribers} />
      ) : null}
    </>
  );
};

export default MediaElementsComponent;
