import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
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
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
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
  const isRecorder = store.getState().session.currentUser?.isRecorder;

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

  const notepadElm = useMemo(() => {
    let classNames = 'hidden';
    if (activeScreenSharingView && isActiveScreenSharing) {
      classNames = 'hidden';
    } else if (isActiveSharedNotePad) {
      dispatch(updateIsActiveParticipantsPanel(false));
      classNames = 'w-full';
    }

    return (
      <div className={classNames}>
        <SharedNotepadElement />
      </div>
    );
  }, [
    dispatch,
    activeScreenSharingView,
    isActiveScreenSharing,
    isActiveSharedNotePad,
  ]);

  // we can't disable to show both external player & link.
  // So, external-media-player will be first priority
  const externalMediaPlayerElm = useMemo(() => {
    let classNames = 'hidden';
    if (
      (activeScreenSharingView && isActiveScreenSharing) ||
      isActiveWhiteboard ||
      isActiveSharedNotePad
    ) {
      classNames = 'hidden';
    } else if (isActiveExternalMediaPlayer) {
      if (!isRecorder) {
        dispatch(updateIsActiveChatPanel(false));
        dispatch(updateIsActiveParticipantsPanel(false));
      }
      classNames = 'w-full';
    }

    return (
      <div className={classNames}>
        <ExternalMediaPlayer />
      </div>
    );
    //eslint-disable-next-line
  }, [
    activeScreenSharingView,
    isActiveScreenSharing,
    isActiveSharedNotePad,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
  ]);

  const displayExternalLinkElm = useMemo(() => {
    let classNames = 'hidden';
    if (
      (activeScreenSharingView && isActiveScreenSharing) ||
      isActiveWhiteboard ||
      isActiveSharedNotePad ||
      isActiveExternalMediaPlayer
    ) {
      classNames = 'hidden';
    } else if (isActiveDisplayExternalLink) {
      if (!isRecorder) {
        dispatch(updateIsActiveChatPanel(false));
        dispatch(updateIsActiveParticipantsPanel(false));
      }
      classNames = 'w-full';
    }

    return (
      <div className={classNames}>
        <DisplayExternalLink />
      </div>
    );
    //eslint-disable-next-line
  }, [
    activeScreenSharingView,
    isActiveScreenSharing,
    isActiveSharedNotePad,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
  ]);

  const shouldShow = useCallback(
    (type: string) => {
      if (type === 'screen_share') {
        return activeScreenSharingView && isActiveScreenSharing;
      } else if (type === 'whiteboard') {
        return !isActiveScreenSharing && isActiveWhiteboard;
      }

      return false;
    },
    [activeScreenSharingView, isActiveScreenSharing, isActiveWhiteboard],
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
        {
          // for screenShare, it's better to null not hide
          shouldShow('screen_share') ? (
            <ScreenShareElements currentConnection={currentConnection} />
          ) : null
        }
        {
          // for whiteboard, it's better to null not hide
          shouldShow('whiteboard') ? <Whiteboard /> : null
        }
        {notepadElm}
        {externalMediaPlayerElm}
        {displayExternalLinkElm}
      </div>
      <AudioElements currentConnection={currentConnection} />
    </>
  );
};

export default MainComponents;
