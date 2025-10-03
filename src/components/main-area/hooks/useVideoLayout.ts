import { useMemo } from 'react';

interface IUseVideoLayoutParams {
  hasScreenShareSubscribers: boolean;
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean;
  isActiveDisplayExternalLink: boolean;
  isActiveWebcamsView: boolean;
  hasVideoSubscribers: boolean;
}

export const useVideoLayout = ({
  hasScreenShareSubscribers,
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
  isActiveWebcamsView,
  hasVideoSubscribers,
}: IUseVideoLayoutParams) => {
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

  return { showVerticalVideoView, showVideoElms };
};
