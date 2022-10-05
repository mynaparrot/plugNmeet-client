import React, { useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import {
  LocalParticipant,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrackPublication,
  Room,
} from 'livekit-client';

import { RootState, useAppSelector } from '../../store';
import ScreenShareElements from '../media-elements/screenshare';
import AudioElements from '../media-elements/audios';
import VideoElements from '../media-elements/videos';
import SharedNotepadElement from '../shared-notepad';
import Whiteboard from '../whiteboard';
import ExternalMediaPlayer from '../external-media-player';
import DisplayExternalLink from '../display-external-link';
import VerticalWebcams from '../media-elements/vertical-webcams';

interface IMainComponentsProps {
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

const MainComponents = ({
  audioSubscribers,
  videoSubscribers,
  screenShareTracks,
}: IMainComponentsProps) => {
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
  const [showFullWebcamView, setShowFullWebcamView] = useState<boolean>(false);
  const [showVerticalWebcamView, setShowVerticalWebcamView] =
    useState<boolean>(false);
  const [hasVideoElms, setHasVideoElms] = useState<boolean>(false);

  useEffect(() => {
    if (!activateWebcamsView) {
      setShowFullWebcamView(false);
      setShowVerticalWebcamView(false);
      setHasVideoElms(false);
      return;
    } else if (activateWebcamsView && videoSubscribers?.size) {
      setHasVideoElms(true);
    }

    if (
      !isActiveScreenSharing &&
      !isActiveSharedNotePad &&
      !isActiveWhiteboard &&
      !isActiveExternalMediaPlayer &&
      !isActiveDisplayExternalLink
    ) {
      setShowFullWebcamView(true);
      setShowVerticalWebcamView(false);
    } else {
      setShowFullWebcamView(false);
      setShowVerticalWebcamView(true);
    }
  }, [
    videoSubscribers?.size,
    activateWebcamsView,
    isActiveScreenSharing,
    isActiveSharedNotePad,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
  ]);

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

  const videoSubscriberElms = useMemo(() => {
    if (!videoSubscribers?.size) {
      setHasVideoElms(false);
      return null;
    }

    if (showFullWebcamView) {
      return <VideoElements videoSubscribers={videoSubscribers} />;
    } else if (showVerticalWebcamView) {
      return <VerticalWebcams videoSubscribers={videoSubscribers} />;
    } else {
      return null;
    }
  }, [videoSubscribers, showFullWebcamView, showVerticalWebcamView]);

  return (
    <>
      {shouldShowScreenSharing() && screenShareTracks ? (
        <div className="middle-fullscreen-wrapper share-screen-wrapper is-share-screen-running">
          {videoSubscriberElms}
          <ScreenShareElements screenShareTracks={screenShareTracks} />
        </div>
      ) : null}
      {shouldShowSharedNotepad() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoSubscriberElms}
          <SharedNotepadElement />
        </div>
      ) : null}
      {shouldShowWhiteboard() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoSubscriberElms}
          <Whiteboard />
        </div>
      ) : null}
      {shouldShowExternalMediaPlayer() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoSubscriberElms}
          <ExternalMediaPlayer />
        </div>
      ) : null}
      {shouldDisplayExternalLink() ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            hasVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoSubscriberElms}
          <DisplayExternalLink />
        </div>
      ) : null}
      {
        // for webcams in full view
        videoSubscriberElms
      }
      {audioSubscribers ? (
        <AudioElements audioSubscribers={audioSubscribers} />
      ) : null}
    </>
  );
};

export default MainComponents;
