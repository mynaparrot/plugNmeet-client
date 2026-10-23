import React, { Suspense, useMemo } from 'react';
import { useCloseSidePanelsOnShow } from './useCloseSidePanelsOnShow';

const DisplayExternalLink = React.lazy(() => import('../../display-external-link'));

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
        {shouldShow ? (
          <Suspense fallback={null}>
            <DisplayExternalLink />
          </Suspense>
        ) : null}
      </div>
    );
  }, [shouldShow]);
};
