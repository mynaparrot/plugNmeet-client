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
import { useInsightsAiTextChat } from './hooks/useInsightsAiTextChat';
import { useNotepadController } from '../shared-notepad/useNotepadController';

interface IMainViewProps {
  isRecorder: boolean;
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean;
  isActiveDisplayExternalLink: boolean;
  hasScreenShareSubscribers: boolean;
  hasVideoSubscribers: boolean;
}

const MainView = ({
  isRecorder,
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
  hasScreenShareSubscribers,
  hasVideoSubscribers,
}: IMainViewProps) => {
  const { showVerticalVideoView, showVideoElms, pinCamUserId } = useVideoLayout(
    {
      hasScreenShareSubscribers,
      isActiveWhiteboard,
      isActiveExternalMediaPlayer,
      isActiveDisplayExternalLink,
      hasVideoSubscribers,
    },
  );

  const sharedNotepadElm = useSharedNotepad();
  useNotepadController();
  const insightsAiTextChatElm = useInsightsAiTextChat();
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
    hasVideoSubscribers,
    showVerticalVideoView,
  );
  const screenShareElementsElm = useScreenShareElements(
    hasScreenShareSubscribers,
  );
  const translationTranscriptionElm = useTranslationTranscription();

  return (
    <>
      <LayoutWrapper
        isActiveScreenShare={hasScreenShareSubscribers}
        showVideoElms={showVideoElms}
        showVerticalVideoView={showVerticalVideoView}
        pinCamUserId={pinCamUserId}
      >
        {videosComponentElm}
        {screenShareElementsElm}
        {sharedNotepadElm}
        {insightsAiTextChatElm}
        {whiteboardElm}
        {translationTranscriptionElm}
        {externalMediaPlayerElm}
        {displayExternalLinkElm}
      </LayoutWrapper>
      <AudioElements />
    </>
  );
};

export default React.memo(MainView);
