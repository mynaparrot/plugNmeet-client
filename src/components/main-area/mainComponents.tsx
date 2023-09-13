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
import SpeechToTextService from '../speech-to-text-service';

interface IMainComponentsProps {
  currentConnection: IConnectLivekit;
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean;
  isActiveDisplayExternalLink: boolean;
  isActiveScreenSharingView: boolean;
}

const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);

const activateSpeechServiceSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .speech_to_text_translation_features.is_enabled,
  (is_enabled) => is_enabled,
);

const MainComponents = ({
  currentConnection,
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
  isActiveScreenSharingView,
}: IMainComponentsProps) => {
  const dispatch = useAppDispatch();
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);
  const activateSpeechService = useAppSelector(activateSpeechServiceSelector);

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

  // we can't disable to show both external player & link.
  // So, external-media-player will be first priority
  const externalMediaPlayerElm = useMemo(() => {
    let classNames = 'hidden';
    if (
      (isActiveScreenSharingView && isActiveScreenShare) ||
      isActiveWhiteboard
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
    isActiveScreenSharingView,
    isActiveScreenShare,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
  ]);

  const displayExternalLinkElm = useMemo(() => {
    let classNames = 'hidden';
    if (
      (isActiveScreenSharingView && isActiveScreenShare) ||
      isActiveWhiteboard ||
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
    isActiveScreenSharingView,
    isActiveScreenShare,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
  ]);

  const cssClasses = useMemo(() => {
    const cssClasses: Array<string> = [];
    if (isActiveScreenSharingView && isActiveScreenShare) {
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
    isActiveScreenSharingView,
    isActiveScreenShare,
    showVideoElms,
    showVerticalVideoView,
  ]);

  return (
    <>
      <div className={cssClasses}>
        <SharedNotepadElement />
        {activateWebcamsView ? (
          <VideosComponent
            currentConnection={currentConnection}
            isVertical={showVerticalVideoView}
          />
        ) : null}
        {isActiveScreenSharingView ? (
          <ScreenShareElements currentConnection={currentConnection} />
        ) : null}
        {whiteboardElm}
        {externalMediaPlayerElm}
        {displayExternalLinkElm}
        {activateSpeechService ? (
          <SpeechToTextService currentRoom={currentConnection.room} />
        ) : null}
      </div>
      <AudioElements currentConnection={currentConnection} />
    </>
  );
};

export default MainComponents;
