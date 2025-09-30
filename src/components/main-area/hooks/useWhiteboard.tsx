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
