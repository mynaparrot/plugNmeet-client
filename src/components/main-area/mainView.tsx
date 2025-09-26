import React, { useMemo } from 'react';

import { useAppSelector } from '../../store';
import { useSharedNotepad } from './hooks/useSharedNotepad';
import { useWhiteboard } from './hooks/useWhiteboard';
import { useExternalMediaPlayer } from './hooks/useExternalMediaPlayer';
import { useDisplayExternalLink } from './hooks/useDisplayExternalLink';

import ScreenShareElements from '../media-elements/screenshare';
import AudioElements from '../media-elements/audios';
import VideosComponent from '../media-elements/videos';
import SpeechToTextService from '../speech-to-text-service';
import LayoutWrapper from './layoutWrapper';

interface IMainViewProps {
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean;
  isActiveDisplayExternalLink: boolean;
  isActiveScreenSharingView: boolean;
  hasScreenShareSubscribers: boolean;
  isActiveWebcamsView: boolean;
  hasVideoSubscribers: boolean;
}

const MainView = ({
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
  isActiveScreenSharingView,
  hasScreenShareSubscribers,
  isActiveWebcamsView,
  hasVideoSubscribers,
}: IMainViewProps) => {
  const activateSpeechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures?.isEnabled,
  );

  const showVerticalVideoView = useMemo(
    () =>
      hasScreenShareSubscribers ||
      isActiveWhiteboard ||
      isActiveExternalMediaPlayer ||
      isActiveDisplayExternalLink,
    [
      hasScreenShareSubscribers,
      isActiveWhiteboard,
      isActiveExternalMediaPlayer,
      isActiveDisplayExternalLink,
    ],
  );

  const showVideoElms = useMemo(
    () => isActiveWebcamsView && hasVideoSubscribers,
    [isActiveWebcamsView, hasVideoSubscribers],
  );

  const sharedNotepadElm = useSharedNotepad();
  const whiteboardElm = useWhiteboard(
    isActiveWhiteboard,
    hasScreenShareSubscribers,
    showVideoElms,
  );
  const externalMediaPlayerElm = useExternalMediaPlayer(
    isActiveExternalMediaPlayer,
    hasScreenShareSubscribers,
    isActiveWhiteboard,
  );
  const displayExternalLinkElm = useDisplayExternalLink(
    isActiveDisplayExternalLink,
    hasScreenShareSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
  );

  return (
    <>
      <LayoutWrapper
        isActiveScreenShare={
          isActiveScreenSharingView && hasScreenShareSubscribers
        }
        showVideoElms={showVideoElms}
        showVerticalVideoView={showVerticalVideoView}
      >
        {sharedNotepadElm}
        {isActiveWebcamsView ? (
          <VideosComponent isVertical={showVerticalVideoView} />
        ) : null}
        {isActiveScreenSharingView ? <ScreenShareElements /> : null}
        {whiteboardElm}
        {externalMediaPlayerElm}
        {displayExternalLinkElm}
        {activateSpeechService ? <SpeechToTextService /> : null}
      </LayoutWrapper>
      <AudioElements />
    </>
  );
};

export default MainView;
