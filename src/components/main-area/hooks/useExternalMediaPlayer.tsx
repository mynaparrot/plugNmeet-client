import React, { Suspense, useMemo } from 'react';
import { useCloseSidePanelsOnShow } from './useCloseSidePanelsOnShow';

const ExternalMediaPlayer = React.lazy(() => import('../../external-media-player'));

export const useExternalMediaPlayer = (
  isActiveExternalMediaPlayer: boolean,
  isActiveScreenShare: boolean,
  isActiveWhiteboard: boolean,
  isRecorder: boolean,
) => {
  const shouldShow = useMemo(
    () => isActiveExternalMediaPlayer && !isActiveScreenShare && !isActiveWhiteboard,
    [isActiveExternalMediaPlayer, isActiveScreenShare, isActiveWhiteboard],
  );

  useCloseSidePanelsOnShow(shouldShow, isRecorder);

  return useMemo(() => {
    return (
      <div
        className={`${shouldShow ? 'Div-external-media-player w-full flex items-center justify-center' : 'hidden'}`}
      >
        {shouldShow ? (
          <Suspense fallback={null}>
            <ExternalMediaPlayer />
          </Suspense>
        ) : null}
      </div>
    );
  }, [shouldShow]);
};
