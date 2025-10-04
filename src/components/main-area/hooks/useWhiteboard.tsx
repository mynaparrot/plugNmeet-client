import { useEffect, useMemo, useState } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { debounce } from 'es-toolkit';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { savePageData } from '../../whiteboard/helpers/utils';
import Whiteboard from '../../whiteboard';
import { doRefreshWhiteboard } from '../../../store/slices/whiteboard';

export const useWhiteboard = (
  isActiveWhiteboard: boolean,
  isActiveScreenShare: boolean,
  showVideoElms: boolean,
) => {
  const dispatch = useAppDispatch();
  const [excalidrawAPI, excalidrawRefCallback] =
    useState<ExcalidrawImperativeAPI>();

  const isEnabledExtendedVerticalCamView = useAppSelector(
    (state) => state.bottomIconsActivity.isEnabledExtendedVerticalCamView,
  );

  const debouncedRefresh = useMemo(
    () =>
      debounce(() => {
        dispatch(doRefreshWhiteboard());
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
  }, [
    showVideoElms,
    isEnabledExtendedVerticalCamView,
    isActiveWhiteboard,
    debouncedRefresh,
  ]);

  return useMemo(() => {
    const whiteboardWillBeVisible = !isActiveScreenShare && isActiveWhiteboard;

    if (whiteboardWillBeVisible) {
      return <Whiteboard onReadyExcalidrawAPI={excalidrawRefCallback} />;
    } else if (excalidrawAPI) {
      // if whiteboard will not be visible, we'll save the data before returning null
      const s = store.getState();
      const isPresenter = s.session.currentUser?.metadata?.isPresenter;
      if (isPresenter) {
        const lastPage = s.whiteboard.currentPage;
        savePageData(excalidrawAPI, lastPage);
      }
    }
    return null;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveScreenShare, isActiveWhiteboard, excalidrawRefCallback]);
};
