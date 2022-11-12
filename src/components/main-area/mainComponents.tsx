import React, { useEffect, useMemo, useState } from 'react';
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
  const [isActiveScreenShare, setIsActiveScreenShare] =
    useState<boolean>(false);

  useEffect(() => {
    setHasVideoElms(currentConnection.videoSubscribersMap.size > 0);
    currentConnection.on(CurrentConnectionEvents.VideoStatus, setHasVideoElms);

    setIsActiveScreenShare(currentConnection.screenShareTracksMap.size > 0);
    currentConnection.on(
      CurrentConnectionEvents.ScreenShareStatus,
      setIsActiveScreenShare,
    );
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.VideoStatus,
        setHasVideoElms,
      );
      currentConnection.off(
        CurrentConnectionEvents.ScreenShareStatus,
        setIsActiveScreenShare,
      );
    };
  }, [currentConnection]);

  useEffect(() => {
    if (
      !isActiveScreenShare &&
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
    isActiveScreenShare,
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
        dispatch(doRefreshWhiteboard());
      }
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [showVideoElms, isActiveWhiteboard, dispatch]);

  const whiteboardElm = useMemo(() => {
    // for whiteboard, it's better to null not hide
    return !isActiveScreenShare && isActiveWhiteboard ? <Whiteboard /> : null;
  }, [isActiveScreenShare, isActiveWhiteboard]);

  const notepadElm = useMemo(() => {
    let classNames = 'hidden';
    if (activeScreenSharingView && isActiveScreenShare) {
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
    isActiveScreenShare,
    isActiveSharedNotePad,
  ]);

  // we can't disable to show both external player & link.
  // So, external-media-player will be first priority
  const externalMediaPlayerElm = useMemo(() => {
    let classNames = 'hidden';
    if (
      (activeScreenSharingView && isActiveScreenShare) ||
      isActiveWhiteboard ||
      isActiveSharedNotePad
    ) {
      classNames = 'hidden';
    } else if (isActiveExternalMediaPlayer) {
      if (!isRecorder) {
        dispatch(updateIsActiveChatPanel(false));
        dispatch(updateIsActiveParticipantsPanel(false));
      }
      classNames =
        'Div-external-media-player w-full flex items-center justify-center';
    }

    return (
      <div className={classNames}>
        <ExternalMediaPlayer />
      </div>
    );
    //eslint-disable-next-line
  }, [
    activeScreenSharingView,
    isActiveScreenShare,
    isActiveSharedNotePad,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
  ]);

  const displayExternalLinkElm = useMemo(() => {
    let classNames = 'hidden';
    if (
      (activeScreenSharingView && isActiveScreenShare) ||
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
    isActiveScreenShare,
    isActiveSharedNotePad,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
  ]);

  const cssClasses = useMemo(() => {
    const cssClasses: Array<string> = [];
    if (activeScreenSharingView && isActiveScreenShare) {
      cssClasses.push(
        'middle-fullscreen-wrapper share-screen-wrapper is-share-screen-running',
      );
      if (showVideoElms && showVerticalVideoView) {
        cssClasses.push('verticalsWebcamsActivated');
      }
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
  }, [
    activeScreenSharingView,
    isActiveScreenShare,
    showVideoElms,
    showVerticalVideoView,
  ]);

  return (
    <>
      <div className={cssClasses}>
        {activateWebcamsView ? (
          <VideosComponent
            currentConnection={currentConnection}
            isVertical={showVerticalVideoView}
          />
        ) : null}
        {activeScreenSharingView ? (
          <ScreenShareElements currentConnection={currentConnection} />
        ) : null}
        {whiteboardElm}
        {notepadElm}
        {externalMediaPlayerElm}
        {displayExternalLinkElm}
      </div>
      <AudioElements currentConnection={currentConnection} />
    </>
  );
};

export default MainComponents;
