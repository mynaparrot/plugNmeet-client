import { useMemo } from 'react';
import { useAppSelector } from '../../../store';

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
  const pinCamUserId = useAppSelector(
    (state) => state.roomSettings.pinCamUserId,
  );

  const showVerticalVideoView = useMemo(
    () =>
      hasScreenShareSubscribers ||
      isActiveWhiteboard ||
      isActiveExternalMediaPlayer ||
      isActiveDisplayExternalLink ||
      pinCamUserId !== undefined,
    [
      hasScreenShareSubscribers,
      isActiveWhiteboard,
      isActiveExternalMediaPlayer,
      isActiveDisplayExternalLink,
      pinCamUserId,
    ],
  );

  const showVideoElms = useMemo(
    () => isActiveWebcamsView && hasVideoSubscribers,
    [isActiveWebcamsView, hasVideoSubscribers],
  );

  return { showVerticalVideoView, showVideoElms, pinCamUserId };
};
