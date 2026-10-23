import React, { Suspense, useEffect, useMemo } from 'react';
import { debounce } from 'es-toolkit';

import { useAppDispatch, useAppSelector } from '../../../store';
import { triggerRefreshWhiteboard } from '../../../store/slices/whiteboard';
import LazyFeatureFallback from '../lazyFeatureFallback';

const Whiteboard = React.lazy(() => import('../../whiteboard'));

export const useWhiteboard = (
  isActiveWhiteboard: boolean,
  isActiveScreenShare: boolean,
  showVideoElms: boolean,
) => {
  const dispatch = useAppDispatch();

  const isEnabledExtendedVerticalCamView = useAppSelector(
    (state) => state.bottomIconsActivity.isEnabledExtendedVerticalCamView,
  );

  const debouncedRefresh = useMemo(
    () =>
      debounce(() => {
        dispatch(triggerRefreshWhiteboard());
      }, 500),
    [dispatch],
  );

  // effect to refresh whiteboard when video elements are shown
  // or extended button toggled
  // reset of panel toggled related handled by SidePanel component
  useEffect(() => {
    if (isActiveWhiteboard) {
      debouncedRefresh();
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [showVideoElms, isEnabledExtendedVerticalCamView, isActiveWhiteboard, debouncedRefresh]);

  return useMemo(() => {
    const whiteboardWillBeVisible = !isActiveScreenShare && isActiveWhiteboard;

    if (whiteboardWillBeVisible) {
      return (
        <Suspense fallback={<LazyFeatureFallback label="whiteboard.whiteboard-area" />}>
          <Whiteboard />
        </Suspense>
      );
    }
    return null;
  }, [isActiveScreenShare, isActiveWhiteboard]);
};
