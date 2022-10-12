import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import ScreenShareElements from '../media-elements/screenshare';
import AudioElements from '../media-elements/audios';
import SharedNotepadElement from '../shared-notepad';
import Whiteboard from '../whiteboard';
import ExternalMediaPlayer from '../external-media-player';
import DisplayExternalLink from '../display-external-link';
import VideosComponent from '../media-elements/videos';
import { doRefreshWhiteboard } from '../../store/slices/whiteboard';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../helpers/livekit/types';
import {
  updateIsActiveSharedNotePad,
  updateIsActiveWhiteboard,
} from '../../store/slices/bottomIconsActivitySlice';

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
  const [showVerticalVideoView, setShowVerticalVideoView] =
    useState<boolean>(false);
  const [hasVideoElms, setHasVideoElms] = useState<boolean>(false);
  const [showVideoElms, setShowVideoElms] = useState<boolean>(false);

  useEffect(() => {
    setHasVideoElms(currentConnection.videoSubscribersMap.size > 0);
    currentConnection.on(CurrentConnectionEvents.VideoStatus, setHasVideoElms);
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.VideoStatus,
        setHasVideoElms,
      );
    };
  }, [currentConnection]);

  useEffect(() => {
    if (isActiveDisplayExternalLink || isActiveExternalMediaPlayer) {
      dispatch(updateIsActiveSharedNotePad(false));
      dispatch(updateIsActiveWhiteboard(false));
    }
  }, [isActiveExternalMediaPlayer, isActiveDisplayExternalLink, dispatch]);

  useEffect(() => {
    if (
      !isActiveScreenSharing &&
      !isActiveSharedNotePad &&
      !isActiveWhiteboard &&
      !isActiveExternalMediaPlayer &&
      !isActiveDisplayExternalLink
    ) {
      setShowVerticalVideoView(false);
    } else {
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
      }
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [showVideoElms, isActiveWhiteboard, dispatch]);

  const shouldShow = useCallback(
    (type: string) => {
      if (type === 'screen_share') {
        return activeScreenSharingView && isActiveScreenSharing;
      } else if (type === 'shared_notepad') {
        return (
          !isActiveScreenSharing &&
          !isActiveExternalMediaPlayer &&
          !isActiveDisplayExternalLink &&
          isActiveSharedNotePad
        );
      } else if (type === 'whiteboard') {
        return (
          !isActiveScreenSharing &&
          !isActiveExternalMediaPlayer &&
          !isActiveDisplayExternalLink &&
          isActiveWhiteboard
        );
      } else if (type === 'external-media-player') {
        // we can't disable to show both external player & link.
        // So, external-media-player will be first priority
        return !isActiveScreenSharing && isActiveExternalMediaPlayer;
      } else if (type === 'display-external-link') {
        return (
          !isActiveScreenSharing &&
          !isActiveExternalMediaPlayer &&
          isActiveDisplayExternalLink
        );
      }

      return false;
    },
    [
      activeScreenSharingView,
      isActiveScreenSharing,
      isActiveSharedNotePad,
      isActiveWhiteboard,
      isActiveExternalMediaPlayer,
      isActiveDisplayExternalLink,
    ],
  );

  const cssClasses = useMemo(() => {
    const cssClasses: Array<string> = [];
    if (shouldShow('screen_share')) {
      cssClasses.push(
        'middle-fullscreen-wrapper share-screen-wrapper is-share-screen-running',
      );
    } else {
      if (showVideoElms && !showVerticalVideoView) {
        cssClasses.push('h-full');
      } else if (showVideoElms && showVerticalVideoView) {
        cssClasses.push(
          'middle-fullscreen-wrapper h-full flex verticalsWebcamsActivated',
        );
      } else {
        cssClasses.push('middle-fullscreen-wrapper h-full flex');
      }
    }
    return cssClasses.join(' ');
  }, [shouldShow, showVideoElms, showVerticalVideoView]);

  return (
    <>
      <div className={cssClasses}>
        {activateWebcamsView ? (
          <VideosComponent
            currentConnection={currentConnection}
            isVertical={showVerticalVideoView}
          />
        ) : null}
        {shouldShow('screen_share') ? (
          <ScreenShareElements currentConnection={currentConnection} />
        ) : null}
        {shouldShow('shared_notepad') ? <SharedNotepadElement /> : null}
        {shouldShow('whiteboard') ? <Whiteboard /> : null}
        {shouldShow('external-media-player') ? <ExternalMediaPlayer /> : null}
        {shouldShow('display-external-link') ? <DisplayExternalLink /> : null}
      </div>
      <AudioElements currentConnection={currentConnection} />
    </>
  );
};

export default MainComponents;
