import { useMemo } from 'react';

import { store } from '../../../store';
import ExternalMediaPlayer from '../../external-media-player';
import { useCloseSidePanelsOnShow } from './useCloseSidePanelsOnShow';

export const useExternalMediaPlayer = (
  isActiveExternalMediaPlayer: boolean,
  isActiveScreenShare: boolean,
  isActiveWhiteboard: boolean,
) => {
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const shouldShow = useMemo(
    () =>
      isActiveExternalMediaPlayer &&
      !isActiveScreenShare &&
      !isActiveWhiteboard,
    [isActiveExternalMediaPlayer, isActiveScreenShare, isActiveWhiteboard],
  );

  useCloseSidePanelsOnShow(shouldShow, isRecorder);

  return useMemo(() => {
    if (shouldShow) {
      return (
        <div className="Div-external-media-player w-full flex items-center justify-center">
          <ExternalMediaPlayer />
        </div>
      );
    }
    return null;
  }, [shouldShow]);
};
