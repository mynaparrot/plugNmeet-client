import React from 'react';

import { useSharedNotepad } from './hooks/useSharedNotepad';
import { useWhiteboard } from './hooks/useWhiteboard';
import { useExternalMediaPlayer } from './hooks/useExternalMediaPlayer';
import { useDisplayExternalLink } from './hooks/useDisplayExternalLink';
import { useVideosComponent } from './hooks/useVideosComponent';
import { useScreenShareElements } from './hooks/useScreenShareElements';
import { useTranslationTranscription } from './hooks/useTranslationTranscription';
import { useVideoLayout } from './hooks/useVideoLayout';

import AudioElements from '../media-elements/audios';
import LayoutWrapper from './layoutWrapper';

interface IMainViewProps {
  isRecorder: boolean;
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean;
  isActiveDisplayExternalLink: boolean;
  isActiveScreenSharingView: boolean;
  hasScreenShareSubscribers: boolean;
  isActiveWebcamsView: boolean;
  hasVideoSubscribers: boolean;
}

const MainView = ({
  isRecorder,
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
  isActiveScreenSharingView,
  hasScreenShareSubscribers,
  isActiveWebcamsView,
  hasVideoSubscribers,
}: IMainViewProps) => {
  const { showVerticalVideoView, showVideoElms, pinCamUserId } = useVideoLayout(
    {
      hasScreenShareSubscribers,
      isActiveWhiteboard,
      isActiveExternalMediaPlayer,
      isActiveDisplayExternalLink,
      isActiveWebcamsView,
      hasVideoSubscribers,
    },
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
    isRecorder,
  );
  const displayExternalLinkElm = useDisplayExternalLink(
    isActiveDisplayExternalLink,
    hasScreenShareSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isRecorder,
  );

  const videosComponentElm = useVideosComponent(
    isActiveWebcamsView,
    showVerticalVideoView,
  );
  const screenShareElementsElm = useScreenShareElements(
    isActiveScreenSharingView,
  );
  const translationTranscriptionElm = useTranslationTranscription();

  return (
    <>
      <LayoutWrapper
        isActiveScreenShare={
          isActiveScreenSharingView && hasScreenShareSubscribers
        }
        showVideoElms={showVideoElms}
        showVerticalVideoView={showVerticalVideoView}
        pinCamUserId={pinCamUserId}
      >
        {videosComponentElm}
        {screenShareElementsElm}
        {sharedNotepadElm}
        {whiteboardElm}
        {translationTranscriptionElm}
        {externalMediaPlayerElm}
        {displayExternalLinkElm}
      </LayoutWrapper>
      <AudioElements />
    </>
  );
};

export default MainView;
