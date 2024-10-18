import React, { useEffect, useMemo, useState } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

import { store, useAppDispatch, useAppSelector } from '../../store';
import ScreenShareElements from '../media-elements/screenshare';
import AudioElements from '../media-elements/audios';
import SharedNotepadElement from '../shared-notepad';
import Whiteboard from '../whiteboard';
import ExternalMediaPlayer from '../external-media-player';
import DisplayExternalLink from '../display-external-link';
import VideosComponent from '../media-elements/videos';
import { doRefreshWhiteboard } from '../../store/slices/whiteboard';
import { CurrentConnectionEvents } from '../../helpers/livekit/types';
import {
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
} from '../../store/slices/bottomIconsActivitySlice';
import SpeechToTextService from '../speech-to-text-service';
import { useCallbackRefState } from '../whiteboard/helpers/hooks/useCallbackRefState';
import { savePageData } from '../whiteboard/helpers/utils';
import { getMediaServerConn } from '../../helpers/livekit/utils';

interface IMainComponentsProps {
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean;
  isActiveDisplayExternalLink: boolean;
  isActiveScreenSharingView: boolean;
}

const MainComponents = ({
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
  isActiveScreenSharingView,
}: IMainComponentsProps) => {
  const dispatch = useAppDispatch();
  const isRecorder = store.getState().session.currentUser?.isRecorder;
  const currentConnection = getMediaServerConn();

  const activateWebcamsView = useAppSelector(
    (state) => state.roomSettings.activateWebcamsView,
  );
  const activateSpeechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures?.isEnabled,
  );
  const isActiveSharedNotepad = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );

  const [showVerticalVideoView, setShowVerticalVideoView] =
    useState<boolean>(false);
  const [hasVideoElms, setHasVideoElms] = useState<boolean>(false);
  const [showVideoElms, setShowVideoElms] = useState<boolean>(false);
  const [isActiveScreenShare, setIsActiveScreenShare] =
    useState<boolean>(false);
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

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
    //eslint-disable-next-line
  }, []);

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
    // if we disable whiteboard during that time we should collect elements from parent component
    // otherwise if we make it null then we won't be able to get last state
    if (
      ((isActiveWhiteboard && isActiveScreenShare) || !isActiveWhiteboard) &&
      excalidrawAPI
    ) {
      const s = store.getState();
      const isPresenter = s.session.currentUser?.metadata?.isPresenter;
      // we'll only do it for presenter
      if (isPresenter) {
        const lastPage = s.whiteboard.currentPage;
        savePageData(excalidrawAPI, lastPage);
      }
    }
    // for whiteboard, it's better to null not hide
    return !isActiveScreenShare && isActiveWhiteboard ? (
      <Whiteboard onReadyExcalidrawAPI={excalidrawRefCallback} />
    ) : null;
    //eslint-disable-next-line
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
        setTimeout(() => {
          dispatch(updateIsActiveChatPanel(false));
          dispatch(updateIsActiveParticipantsPanel(false));
        }, 200);
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
        setTimeout(() => {
          dispatch(updateIsActiveChatPanel(false));
          dispatch(updateIsActiveParticipantsPanel(false));
        }, 200);
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

  // this will help to reset position, if something went wrong
  const sharedNotepadElm = useMemo(() => {
    if (isActiveSharedNotepad) {
      return <SharedNotepadElement />;
    }
    return null;
  }, [isActiveSharedNotepad]);

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
        {sharedNotepadElm}
        {activateWebcamsView ? (
          <VideosComponent isVertical={showVerticalVideoView} />
        ) : null}
        {isActiveScreenSharingView ? <ScreenShareElements /> : null}
        {whiteboardElm}
        {externalMediaPlayerElm}
        {displayExternalLinkElm}
        {activateSpeechService ? <SpeechToTextService /> : null}
      </div>
      <AudioElements />
    </>
  );
};

export default MainComponents;
