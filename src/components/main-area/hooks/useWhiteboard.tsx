import { useEffect, useMemo } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { store, useAppDispatch } from '../../../store';
import { doRefreshWhiteboard } from '../../../store/slices/whiteboard';
import { useCallbackRefState } from '../../whiteboard/helpers/hooks/useCallbackRefState';
import { savePageData } from '../../whiteboard/helpers/utils';
import Whiteboard from '../../whiteboard';

export const useWhiteboard = (
  isActiveWhiteboard: boolean,
  isActiveScreenShare: boolean,
  showVideoElms: boolean,
) => {
  const dispatch = useAppDispatch();
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

  // effect to save whiteboard data when it's hidden or screen sharing starts
  useEffect(() => {
    if (
      ((isActiveWhiteboard && isActiveScreenShare) || !isActiveWhiteboard) &&
      excalidrawAPI
    ) {
      const s = store.getState();
      const isPresenter = s.session.currentUser?.metadata?.isPresenter;
      if (isPresenter) {
        const lastPage = s.whiteboard.currentPage;
        savePageData(excalidrawAPI, lastPage);
      }
    }
  }, [isActiveWhiteboard, isActiveScreenShare, excalidrawAPI]);

  // effect to refresh whiteboard when video elements are shown
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isActiveWhiteboard) {
        dispatch(doRefreshWhiteboard());
      }
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [showVideoElms, isActiveWhiteboard, dispatch]);

  return useMemo(() => {
    return !isActiveScreenShare && isActiveWhiteboard ? (
      <Whiteboard onReadyExcalidrawAPI={excalidrawRefCallback} />
    ) : null;
  }, [isActiveScreenShare, isActiveWhiteboard, excalidrawRefCallback]);
};
