import { useMemo } from 'react';

import { store } from '../../../store';
import DisplayExternalLink from '../../display-external-link';
import { useCloseSidePanelsOnShow } from './useCloseSidePanelsOnShow';

export const useDisplayExternalLink = (
  isActiveDisplayExternalLink: boolean,
  isActiveScreenShare: boolean,
  isActiveWhiteboard: boolean,
  isActiveExternalMediaPlayer: boolean,
) => {
  const isRecorder = store.getState().session.currentUser?.isRecorder;

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
    if (shouldShow) {
      return (
        <div className="w-full">
          <DisplayExternalLink />
        </div>
      );
    }
    return null;
  }, [shouldShow]);
};
