import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
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
import { doRefreshWhiteboard } from '../../store/slices/whiteboard';

interface IMainComponentsProps {
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
const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);

const MainComponents = ({ currentConnection }: IMainComponentsProps) => {
  const dispatch = useAppDispatch();
  // const refreshWhiteboard = useRef(
  //   throttle(
  //     () => {
  //       console.log("im here")
  //       dispatch(doRefreshWhiteboard(Date.now()));
  //     },
  //     2000,
  //     { leading: false, trailing: false },
  //   ),
  // );

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
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);
  const [showFullVideoView, setShowFullVideoView] = useState<boolean>(false);
  const [showVerticalVideoView, setShowVerticalVideoView] =
    useState<boolean>(false);
  const [hasVideoElms, setHasVideoElms] = useState<boolean>(false);
  const [showVideoElms, setShowVideoElms] = useState<boolean>(false);

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

  useEffect(() => {
    if (!activateWebcamsView) {
      setShowVideoElms(false);
      return;
    }
    setShowVideoElms(hasVideoElms);
  }, [activateWebcamsView, hasVideoElms]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isActiveWhiteboard) {
        dispatch(doRefreshWhiteboard(Date.now()));
      } else {
        dispatch(doRefreshWhiteboard(0));
      }
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [showVideoElms, isActiveWhiteboard, dispatch]);

  const shouldShowScreenSharing = useCallback(() => {
    if (!activeScreenSharingView) {
      return false;
    }
    return isActiveScreenSharing;
  }, [activeScreenSharingView, isActiveScreenSharing]);

  const shouldShowSharedNotepad = useCallback(() => {
    if (isActiveScreenSharing) {
      return false;
    }
    return isActiveSharedNotePad;
  }, [isActiveScreenSharing, isActiveSharedNotePad]);

  const shouldShowWhiteboard = useCallback(() => {
    if (isActiveScreenSharing) {
      return false;
    }
    return isActiveWhiteboard;
  }, [isActiveScreenSharing, isActiveWhiteboard]);

  const shouldShowExternalMediaPlayer = useCallback(() => {
    if (isActiveScreenSharing) {
      return false;
    }
    return isActiveExternalMediaPlayer;
  }, [isActiveScreenSharing, isActiveExternalMediaPlayer]);

  const shouldDisplayExternalLink = useCallback(() => {
    if (isActiveScreenSharing) {
      return false;
    }
    return isActiveDisplayExternalLink;
  }, [isActiveScreenSharing, isActiveDisplayExternalLink]);

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
      {showFullVideoView ? (
        videoElms
      ) : (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            showVideoElms ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {videoElms}
          {shouldShowSharedNotepad() ? <SharedNotepadElement /> : null}
          {shouldShowWhiteboard() ? <Whiteboard /> : null}
          {shouldShowExternalMediaPlayer() ? <ExternalMediaPlayer /> : null}
          {shouldDisplayExternalLink() ? <DisplayExternalLink /> : null}
        </div>
      )}
      <AudioElements currentConnection={currentConnection} />
    </>
  );
};

export default MainComponents;
