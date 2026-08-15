import { useMemo } from 'react';
import { useAppSelector } from '../../../store';

interface IUseVideoLayoutParams {
  hasScreenShareSubscribers: boolean;
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean;
  isActiveDisplayExternalLink: boolean;
  hasVideoSubscribers: boolean;
}

export const useVideoLayout = ({
  hasScreenShareSubscribers,
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
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
      isActiveDisplayExternalLink,
    [
      hasScreenShareSubscribers,
      isActiveWhiteboard,
      isActiveExternalMediaPlayer,
      isActiveDisplayExternalLink,
    ],
  );

  const showVideoElms = useMemo(
    () => hasVideoSubscribers,
    [hasVideoSubscribers],
  );

  return { showVerticalVideoView, showVideoElms, pinCamUserId };
};
