import { useMemo } from 'react';
import DisplayExternalLink from '../../display-external-link';
import { useCloseSidePanelsOnShow } from './useCloseSidePanelsOnShow';

export const useDisplayExternalLink = (
  isActiveDisplayExternalLink: boolean,
  isActiveScreenShare: boolean,
  isActiveWhiteboard: boolean,
  isActiveExternalMediaPlayer: boolean,
  isRecorder: boolean,
) => {
  const shouldShow = useMemo(
    () =>
      isActiveDisplayExternalLink &&
      !isActiveScreenShare &&
      !isActiveWhiteboard &&
      !isActiveExternalMediaPlayer,
    [
      isActiveDisplayExternalLink,
      isActiveScreenShare,
      isActiveWhiteboard,
      isActiveExternalMediaPlayer,
    ],
  );

  useCloseSidePanelsOnShow(shouldShow, isRecorder);

  return useMemo(() => {
    return (
      <div className={`${shouldShow ? 'w-full block' : 'hidden'}`}>
        <DisplayExternalLink />
      </div>
    );
  }, [shouldShow]);
};
